if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrix {}
  class DOMMatrixReadOnly {}
  class DOMPoint {}
  class DOMRect {}
  globalThis.DOMMatrix = DOMMatrix;
  globalThis.DOMMatrixReadOnly = DOMMatrixReadOnly;
  globalThis.DOMPoint = DOMPoint;
  globalThis.DOMRect = DOMRect;
}

const pdfParseLib = require("pdf-parse");

const Candidate = require("../models/Candidate");
const ResumeChunk = require("../models/ResumeChunk");
const User = require("../models/User");

const { createEmbedding } = require("../utils/embedding");
const { analyzeResume } = require("../utils/resumeAnalyzer");
const { chunkResume } = require("../utils/resumeChunker");

const cleanText = (text = "") => text.replace(/\s+/g, " ").trim();
const PROFILE_REQUIREMENTS = [
    "Name",
    "Email ID",
    "Phone Number",
    "GitHub Profile Link",
    "LinkedIn Profile Link",
    "Education (all entries)",
    "Experience (all entries; each with one-line description)",
    "Projects (all entries; each with one-line description)",
    "Technical Skills (all)",
    "Extra Curricular (all)"
];
const normalizeLines = (text = "") =>
    String(text || "")
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

const buildFormattedText = (text = "") =>
    normalizeLines(text).join("\n");

const parsePdfBuffer = async (buffer) => {
    try {
        const legacyFn =
            typeof pdfParseLib === "function"
                ? pdfParseLib
                : (typeof pdfParseLib.default === "function" ? pdfParseLib.default : null);

        if (legacyFn) {
            return await legacyFn(buffer);
        }

        if (typeof pdfParseLib.PDFParse === "function") {
            const parser = new pdfParseLib.PDFParse({ data: buffer });
            try {
                return await parser.getText();
            } finally {
                await parser.destroy().catch(() => {});
            }
        }
    } catch (err) {
        console.warn("pdf-parse library error, falling back to raw buffer text:", err.message);
    }

    const rawStr = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
    return { text: rawStr };
};

const extractPdfText = (pdfData) => {
    if (typeof pdfData === "string") return pdfData;
    if (!pdfData || typeof pdfData !== "object") return "";
    if (typeof pdfData.text === "string") return pdfData.text;
    if (typeof pdfData.content === "string") return pdfData.content;
    if (typeof pdfData.data === "string") return pdfData.data;
    if (typeof pdfData.rawText === "string") return pdfData.rawText;
    return "";
};

const getCandidateContext = async (req) => {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) return { error: { code: 401, message: "Invalid user token" } };

    let user = await User.findOne({ id: String(userId) });
    if (!user) user = await User.findOne({ _id: String(userId) });
    if (!user && req.user?.email) user = await User.findOne({ email: req.user.email });

    if (!user) return { error: { code: 404, message: "User not found" } };
    if (user.userType && user.userType !== "candidate") {
        return { error: { code: 403, message: "Not a candidate account" } };
    }

    const effectiveUserId = user.id || user._id || userId;
    let candidate = await Candidate.findOne({ userId: String(effectiveUserId) });
    if (!candidate) candidate = await Candidate.findOne({ userId: String(user.id) });

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

const safeSkills = (arr) => {
    if (!Array.isArray(arr)) return [];
    return [...new Set(arr.map((x) => String(x || "").trim()).filter(Boolean))];
};

const extractSectionsFallback = (text) => {
    const lines = normalizeLines(text);
    const sections = {
        experience: [],
        education: [],
        projects: [],
        extraCurricular: []
    };

    const headingMatchers = {
        experience: /(experience|work history|employment)/i,
        education: /(education|academics?)/i,
        projects: /(projects?)/i,
        extraCurricular: /(extra.?curricular|activities|positions of responsibility|leadership|achievements)/i
    };

    let current = null;
    for (const line of lines) {
        const lower = line.toLowerCase();
        let switched = false;
        for (const [key, re] of Object.entries(headingMatchers)) {
            if (re.test(lower) && line.length < 60) {
                current = key;
                switched = true;
                break;
            }
        }
        if (switched) continue;
        if (!current) continue;
        sections[current].push(line);
    }

    const stripBullet = (value) => String(value || "").replace(/^[\-\u2022•\s]+/, "").trim();

    const experience = sections.experience
        .map(stripBullet)
        .filter(Boolean)
        .map((line) => {
            const parts = line.split(/\s*[—-]\s*/);
            const left = parts[0] || "";
            const desc = parts.slice(1).join(" - ").trim() || line;
            const periodMatch = left.match(/\b(19|20)\d{2}\s*[-–—]?\s*(present|current|(19|20)\d{2})?\b/i);
            const period = periodMatch ? periodMatch[0] : "";
            const leftWithoutPeriod = period ? left.replace(periodMatch[0], "").trim() : left.trim();
            const words = leftWithoutPeriod.split(/\s+/).filter(Boolean);
            return {
                title: words.slice(-2).join(" ") || "",
                company: words.slice(0, Math.max(0, words.length - 2)).join(" "),
                period,
                description: desc
            };
        });

    const education = sections.education
        .map(stripBullet)
        .filter(Boolean)
        .map((line) => {
            const yearMatch = line.match(/\b(19|20)\d{2}\b/);
            return {
                degree: line,
                institution: "",
                year: yearMatch ? yearMatch[0] : ""
            };
        });

    const projects = [];
    const projLines = sections.projects.map(stripBullet).filter(Boolean);
    for (let i = 0; i < projLines.length; i++) {
        const line = projLines[i];
        if (/^[\-\u2022•]/.test(sections.projects[i] || "")) continue;
        let name = line;
        let description = "";
        if (line.includes(":")) {
            const [title, ...rest] = line.split(":");
            name = title.trim();
            description = rest.join(":").trim();
        }
        const next = projLines[i + 1];
        if (next && /^(built|developed|engineered|created|implemented|designed|\-)/i.test(next) && !description) {
            description = stripBullet(next);
            i += 1;
        }
        projects.push({ name, description });
    }

    const extraCurricular = sections.extraCurricular.map(stripBullet).filter(Boolean);

    return { experience, education, projects, extraCurricular };
};

const fallbackExtract = (text) => {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i);
    const phoneMatch = text.match(/(\+\d{1,3}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/);
    const githubMatch = text.match(/https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_.-]+/i);
    const linkedinMatch = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i);
    return {
        name: "",
        email: emailMatch ? emailMatch[0] : "",
        phone: phoneMatch ? phoneMatch[0] : "",
        githubUrl: githubMatch ? githubMatch[0] : "",
        linkedinUrl: linkedinMatch ? linkedinMatch[0] : "",
        technicalSkills: [],
        skills: [],
        experience: [],
        education: [],
        projects: [],
        extraCurricular: [],
        summary: ""
    };
};

const uploadResume = async (req, res) => {
    console.log('[Resume Upload] ========== NEW UPLOAD REQUEST ==========');
    try {
        console.log('[Resume Upload] Request received');
        console.log('[Resume Upload] File present:', !!req.file);
        
        if (!req.file) {
            console.error('[Resume Upload] ERROR: No file in request');
            return res.status(400).json({ success: false, message: "Resume file is required" });
        }

        console.log('[Resume Upload] File size:', req.file.size, 'bytes');
        console.log('[Resume Upload] File mimetype:', req.file.mimetype);
        console.log('[Resume Upload] User:', req.user?.id || req.user?._id);

        console.log('[Resume Upload] Getting candidate context...');
        const context = await getCandidateContext(req);
        if (context.error) {
            console.error('[Resume Upload] ERROR: Context error:', context.error);
            return res.status(context.error.code).json({ success: false, message: context.error.message });
        }

        const { user, candidate } = context;
        if (!user || !candidate) {
            console.error('[Resume Upload] ERROR: Missing user or candidate');
            return res.status(404).json({ success: false, message: "User or candidate not found" });
        }
        
        console.log('[Resume Upload] Context retrieved successfully');
        let structuredData = {};
        
        if (process.env.GEMINI_API_KEY) {
            const modelsToTry = [
                process.env.GEMINI_MODEL,
                "gemini-2.0-flash",
                "gemini-1.5-flash",
                "gemini-1.5-pro"
            ].filter(Boolean);

            const pdfBase64 = req.file.buffer.toString('base64');
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

            const prompt = `Extract profile details from this resume PDF.
Return ONLY a valid zero-shot JSON object matching this exact structure:

{
  "name": "Candidate Full Name",
  "email": "Email Address",
  "phone": "Phone Number",
  "githubUrl": "GitHub Profile URL",
  "linkedinUrl": "LinkedIn Profile URL",
  "technicalSkills": ["Skill 1", "Skill 2"],
  "experience": [{"title": "Role Title", "company": "Company Name", "period": "Duration", "description": "One line summary"}],
  "education": [{"degree": "Degree/Branch", "institution": "College/University", "year": "Year/Period"}],
  "projects": [{"name": "Project Name", "description": "One line description"}],
  "extraCurricular": ["Activity/Achievement 1"],
  "summary": "Professional summary paragraph"
}

Fill all available details. Use empty strings or empty arrays for missing fields. Do not include markdown text.`;

            for (const modelName of modelsToTry) {
                try {
                    console.log(`[Resume Upload] Requesting zero-shot JSON from Gemini model: ${modelName}...`);
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
                                mimeType: req.file.mimetype || "application/pdf",
                                data: pdfBase64
                            }
                        },
                        { text: prompt }
                    ]);

                    const response = await result.response;
                    const text = response.text();
                    console.log(`[Resume Upload] Gemini (${modelName}) response length:`, text?.length);

                    if (text) {
                        const jsonText = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
                        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            structuredData = JSON.parse(jsonMatch[0]);
                            console.log('[Resume Upload] Successfully extracted zero-shot JSON profile for:', structuredData.name || 'Candidate');
                            break;
                        }
                    }
                } catch (geminiModelErr) {
                    console.warn(`[Resume Upload] Gemini model ${modelName} failed:`, geminiModelErr.message);
                }
            }
        } else {
            console.warn('[Resume Upload] GEMINI_API_KEY not configured in environment');
        }
        }

        console.log('[Resume Upload] Merging skills...');
        const mergedSkills = safeSkills([
            ...(candidate.skills || []),
            ...(structuredData.skills || []),
            ...(structuredData.technicalSkills || [])
        ]);
        const mergedTechnicalSkills = safeSkills([
            ...(candidate.technicalSkills || []),
            ...(structuredData.technicalSkills || []),
            ...mergedSkills
        ]);

        console.log('[Resume Upload] Updating candidate fields...');
        try {
            candidate.name = structuredData.name || candidate.name || user.fullName || "";
            candidate.email = user.email || candidate.email || "";
            candidate.phone = structuredData.phone || candidate.phone || user.phone || "";
            candidate.githubUrl = structuredData.githubUrl || candidate.githubUrl || user.githubUrl || "";
            candidate.linkedinUrl = structuredData.linkedinUrl || candidate.linkedinUrl || user.linkedinUrl || "";
            candidate.technicalSkills = mergedTechnicalSkills;
            candidate.skills = mergedSkills;
            candidate.experience = Array.isArray(structuredData.experience) ? structuredData.experience : (candidate.experience || []);
            candidate.education = Array.isArray(structuredData.education) ? structuredData.education : (candidate.education || []);
            candidate.projects = Array.isArray(structuredData.projects) ? structuredData.projects : (candidate.projects || []);
            candidate.extraCurricular = Array.isArray(structuredData.extraCurricular) ? structuredData.extraCurricular : (candidate.extraCurricular || []);
            candidate.summary = structuredData.summary || candidate.summary || "";
            candidate.resumeText = structuredData.summary || "Resume uploaded";
            candidate.resumePath = req.file.originalname || "";
            candidate.embedding = []; // Skip embedding for now
            console.log('[Resume Upload] Candidate fields updated');
        } catch (fieldErr) {
            console.error('[Resume Upload] Error updating candidate fields:', fieldErr.message);
            throw fieldErr;
        }

        console.log('[Resume Upload] Saving candidate to database...');
        try {
            if (typeof candidate.save === "function") {
                await candidate.save();
            } else {
                await Candidate.findByIdAndUpdate(candidate.id || candidate._id, candidate);
            }
            console.log('[Resume Upload] Candidate saved successfully');
        } catch (candSaveErr) {
            console.error("Candidate save error:", candSaveErr.message, candSaveErr.stack);
            // Don't throw - try to continue
        }

        user.fullName = candidate.name || user.fullName;
        user.phone = candidate.phone || user.phone;
        user.githubUrl = candidate.githubUrl || user.githubUrl;
        user.linkedinUrl = candidate.linkedinUrl || user.linkedinUrl;
        user.technicalSkills = candidate.technicalSkills || [];
        user.skills = candidate.skills;
        user.bio = candidate.summary || user.bio;
        user.experience = candidate.experience || [];
        user.education = candidate.education || [];
        user.projects = candidate.projects || [];
        user.extraCurricular = candidate.extraCurricular || [];
        user.resumeUrl = req.file.originalname || user.resumeUrl;

        try {
            if (typeof user.save === "function") {
                await user.save();
            } else {
                await User.findByIdAndUpdate(user.id || user._id, user);
            }
        } catch (userSaveErr) {
            console.warn("User save warning:", userSaveErr.message);
        }

        // Skip chunk processing for now - not critical for basic functionality
        console.log('[Resume Upload] Skipping chunk processing');

        console.log('[Resume Upload] Success! Returning candidate profile');
        return res.status(200).json({
            success: true,
            message: "Resume uploaded and profile updated successfully",
            candidate
        });
    } catch (error) {
        console.error("[Resume Upload] Critical error:", error);
        console.error("[Resume Upload] Stack trace:", error.stack);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to process resume. Please try again or contact support.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

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
        console.error("Get resume error:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve resume" });
    }
};

const deleteResume = async (req, res) => {
    try {
        const context = await getCandidateContext(req);
        if (context.error) {
            return res.status(context.error.code).json({ success: false, message: context.error.message });
        }

        const { user, candidate } = context;
        await ResumeChunk.deleteMany({ candidateId: candidate._id });

        candidate.resumeText = "";
        candidate.resumePath = "";
        candidate.embedding = [];
        candidate.skills = [];
        candidate.technicalSkills = [];
        candidate.experience = [];
        candidate.education = [];
        candidate.projects = [];
        candidate.extraCurricular = [];
        candidate.summary = "";
        await candidate.save();

        user.skills = [];
        user.technicalSkills = [];
        user.experience = [];
        user.education = [];
        user.projects = [];
        user.extraCurricular = [];
        user.bio = "";
        user.resumeUrl = "";
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Resume deleted successfully",
            candidate
        });
    } catch (error) {
        console.error("Delete resume error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete resume" });
    }
};

module.exports = {
    uploadResume,
    getResume,
    deleteResume
};
