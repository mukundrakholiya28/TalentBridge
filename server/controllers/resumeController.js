const { GoogleGenerativeAI } = require("@google/generative-ai");
const Candidate = require("../models/Candidate");
const User = require("../models/User");

// ─── Gemini Setup ────────────────────────────────────────────────────────────

const GEMINI_MODELS = [
    process.env.GEMINI_MODEL,
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash"
].filter(Boolean);

const RESUME_PROMPT = `You are a resume parser. Extract all profile details from this resume PDF.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:

{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1 234 567 8900",
  "githubUrl": "https://github.com/username",
  "linkedinUrl": "https://linkedin.com/in/username",
  "title": "Professional Title / Current Role",
  "location": "City, Country",
  "technicalSkills": ["Skill1", "Skill2", "Skill3"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "period": "Start - End",
      "description": "One-line summary of the role"
    }
  ],
  "education": [
    {
      "degree": "Degree Name / Branch",
      "institution": "University / College Name",
      "year": "Year or Period"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "One-line description of the project"
    }
  ],
  "extraCurricular": ["Activity or achievement 1", "Activity or achievement 2"],
  "summary": "A 2-3 sentence professional summary"
}

Rules:
- Extract ALL available information from the resume.
- Keep experience descriptions and project descriptions to ONE concise line each.
- Use full URLs for links when available.
- Only list skills that are explicitly mentioned in the resume.
- Use empty string "" for missing text fields.
- Use empty array [] for missing list fields.
- Do NOT invent information not present in the resume.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Find the candidate context (user + candidate record) from the auth token.
 * Creates a candidate record if one doesn't exist yet.
 */
const getCandidateContext = async (req) => {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) return { error: { code: 401, message: "Invalid user token" } };

    // Find user by id or email
    let user = await User.findOne({ id: String(userId) });
    if (!user && req.user?.email) {
        user = await User.findOne({ email: req.user.email });
    }

    if (!user) return { error: { code: 404, message: "User not found" } };
    if (user.userType && user.userType !== "candidate") {
        return { error: { code: 403, message: "Not a candidate account" } };
    }

    const effectiveUserId = user.id || user._id || userId;

    // Find or create candidate record
    let candidate = await Candidate.findOne({ userId: String(effectiveUserId) });
    if (!candidate) {
        candidate = await Candidate.create({
            userId: effectiveUserId,
            name: user.fullName || "",
            email: user.email || "",
            phone: user.phone || "",
            githubUrl: user.githubUrl || "",
            linkedinUrl: user.linkedinUrl || "",
            title: user.title || "",
            location: user.location || "",
            technicalSkills: user.technicalSkills || user.skills || [],
            skills: user.skills || [],
            summary: user.bio || "",
            experience: user.experience || [],
            education: user.education || [],
            projects: user.projects || [],
            extraCurricular: user.extraCurricular || []
        });
    }

    return { user, candidate };
};

/**
 * Send the PDF to Gemini and get a zero-shot JSON profile response.
 * Tries multiple models in order until one succeeds.
 */
const parseResumeWithGemini = async (pdfBuffer, mimeType) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const pdfBase64 = pdfBuffer.toString("base64");

    for (const modelName of GEMINI_MODELS) {
        try {
            console.log(`[Resume] Trying Gemini model: ${modelName}`);

            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.1
                }
            });

            const result = await model.generateContent([
                {
                    inlineData: {
                        mimeType: mimeType || "application/pdf",
                        data: pdfBase64
                    }
                },
                { text: RESUME_PROMPT }
            ]);

            const response = await result.response;
            const text = response.text();

            if (!text) {
                console.warn(`[Resume] Empty response from ${modelName}`);
                continue;
            }

            // Clean any accidental markdown fencing and parse JSON
            const cleaned = text
                .replace(/^```json\s*/i, "")
                .replace(/\s*```$/, "")
                .replace(/^```\s*/, "")
                .trim();

            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn(`[Resume] No JSON object found in ${modelName} response`);
                continue;
            }

            const parsed = JSON.parse(jsonMatch[0]);
            console.log(`[Resume] ✅ Successfully parsed profile from ${modelName} for: ${parsed.name || "unknown"}`);
            return parsed;

        } catch (err) {
            console.warn(`[Resume] Model ${modelName} failed: ${err.message}`);
        }
    }

    throw new Error("All Gemini models failed to parse the resume");
};

/**
 * Deduplicate and clean a skills array.
 */
const cleanSkills = (arr) => {
    if (!Array.isArray(arr)) return [];
    return [...new Set(
        arr.map(s => String(s || "").trim()).filter(Boolean)
    )];
};

// ─── Route Handlers ──────────────────────────────────────────────────────────

/**
 * POST /api/upload-resume
 * Upload a PDF resume → Gemini parses it → saves to candidate & user profile.
 */
const uploadResume = async (req, res) => {
    console.log("[Resume] ========== NEW UPLOAD REQUEST ==========");
    try {
        // 1. Validate file
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Resume file is required" });
        }
        console.log(`[Resume] File: ${req.file.originalname} (${req.file.size} bytes)`);

        // 2. Get candidate context
        const context = await getCandidateContext(req);
        if (context.error) {
            return res.status(context.error.code).json({ success: false, message: context.error.message });
        }
        const { user, candidate } = context;

        // 3. Send to Gemini for zero-shot JSON extraction
        const parsed = await parseResumeWithGemini(req.file.buffer, req.file.mimetype);

        // 4. Update candidate record with parsed data
        candidate.name = parsed.name || candidate.name || user.fullName || "";
        candidate.email = user.email || candidate.email || "";
        candidate.phone = parsed.phone || candidate.phone || "";
        candidate.githubUrl = parsed.githubUrl || candidate.githubUrl || "";
        candidate.linkedinUrl = parsed.linkedinUrl || candidate.linkedinUrl || "";
        candidate.title = parsed.title || candidate.title || "";
        candidate.location = parsed.location || candidate.location || "";
        candidate.technicalSkills = cleanSkills(parsed.technicalSkills);
        candidate.skills = cleanSkills(parsed.technicalSkills);
        candidate.experience = Array.isArray(parsed.experience) ? parsed.experience : (candidate.experience || []);
        candidate.education = Array.isArray(parsed.education) ? parsed.education : (candidate.education || []);
        candidate.projects = Array.isArray(parsed.projects) ? parsed.projects : (candidate.projects || []);
        candidate.extraCurricular = Array.isArray(parsed.extraCurricular) ? parsed.extraCurricular : (candidate.extraCurricular || []);
        candidate.summary = parsed.summary || candidate.summary || "";
        candidate.resumeText = parsed.summary || "Resume uploaded";
        candidate.resumePath = req.file.originalname || "";

        // Save candidate
        try {
            if (typeof candidate.save === "function") {
                await candidate.save();
            } else {
                await Candidate.findByIdAndUpdate(candidate.id || candidate._id, candidate);
            }
        } catch (saveErr) {
            console.error("[Resume] Candidate save error:", saveErr.message);
        }

        // 5. Sync key fields to user record
        user.fullName = candidate.name || user.fullName;
        user.phone = candidate.phone || user.phone;
        user.githubUrl = candidate.githubUrl || user.githubUrl;
        user.linkedinUrl = candidate.linkedinUrl || user.linkedinUrl;
        user.technicalSkills = candidate.technicalSkills;
        user.skills = candidate.skills;
        user.bio = candidate.summary || user.bio;
        user.experience = candidate.experience;
        user.education = candidate.education;
        user.projects = candidate.projects;
        user.extraCurricular = candidate.extraCurricular;
        user.resumeUrl = req.file.originalname || user.resumeUrl;

        try {
            if (typeof user.save === "function") {
                await user.save();
            } else {
                await User.findByIdAndUpdate(user.id || user._id, user);
            }
        } catch (saveErr) {
            console.warn("[Resume] User save warning:", saveErr.message);
        }

        // 6. Return the updated candidate profile
        console.log("[Resume] ✅ Upload complete for:", candidate.name);
        return res.status(200).json({
            success: true,
            message: "Resume uploaded and profile updated successfully",
            candidate
        });

    } catch (error) {
        console.error("[Resume] Critical error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to process resume. Please try again."
        });
    }
};

/**
 * GET /api/resume
 * Get the stored resume text for the current candidate.
 */
const getResume = async (req, res) => {
    try {
        const context = await getCandidateContext(req);
        if (context.error) {
            return res.status(context.error.code).json({ success: false, message: context.error.message });
        }

        const { candidate } = context;
        if (!candidate.resumeText) {
            return res.status(404).json({ success: false, message: "Resume not found" });
        }

        return res.status(200).json({ success: true, resume: candidate.resumeText });
    } catch (error) {
        console.error("[Resume] Get error:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve resume" });
    }
};

/**
 * DELETE /api/resume
 * Clear all resume data from the candidate and user records.
 */
const deleteResume = async (req, res) => {
    try {
        const context = await getCandidateContext(req);
        if (context.error) {
            return res.status(context.error.code).json({ success: false, message: context.error.message });
        }

        const { user, candidate } = context;

        // Clear candidate fields
        candidate.resumeText = "";
        candidate.resumePath = "";
        candidate.skills = [];
        candidate.technicalSkills = [];
        candidate.experience = [];
        candidate.education = [];
        candidate.projects = [];
        candidate.extraCurricular = [];
        candidate.summary = "";

        if (typeof candidate.save === "function") {
            await candidate.save();
        } else {
            await Candidate.findByIdAndUpdate(candidate.id || candidate._id, candidate);
        }

        // Clear user fields
        user.skills = [];
        user.technicalSkills = [];
        user.experience = [];
        user.education = [];
        user.projects = [];
        user.extraCurricular = [];
        user.bio = "";
        user.resumeUrl = "";

        if (typeof user.save === "function") {
            await user.save();
        } else {
            await User.findByIdAndUpdate(user.id || user._id, user);
        }

        return res.status(200).json({
            success: true,
            message: "Resume deleted successfully",
            candidate
        });
    } catch (error) {
        console.error("[Resume] Delete error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete resume" });
    }
};

module.exports = {
    uploadResume,
    getResume,
    deleteResume
};
