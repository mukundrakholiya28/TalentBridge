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

const normalizeLines = (text = "") =>
    String(text || "")
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

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

const uploadResume = async (req, res) => {
    console.log('[Resume Upload] ========== NEW UPLOAD REQUEST ==========');
    try {
        if (!req.file) {
            console.error('[Resume Upload] ERROR: No file in request');
            return res.status(400).json({ success: false, message: "Resume file is required" });
        }

        console.log('[Resume Upload] File size:', req.file.size, 'bytes');
        console.log('[Resume Upload] Getting candidate context...');
        const context = await getCandidateContext(req);
        if (context.error) {
            console.error('[Resume Upload] ERROR: Context error:', context.error);
            return res.status(context.error.code).json({ success: false, message: context.error.message });
        }

        const { user, candidate } = context;
        if (!user || !candidate) {
            return res.status(404).json({ success: false, message: "User or candidate not found" });
        }

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
        }

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

        try {
            if (typeof candidate.save === "function") {
                await candidate.save();
            } else {
                await Candidate.findByIdAndUpdate(candidate.id || candidate._id, candidate);
            }
        } catch (candSaveErr) {
            console.error("Candidate save error:", candSaveErr.message);
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

        return res.status(200).json({
            success: true,
            message: "Resume uploaded and profile updated successfully",
            candidate
        });
    } catch (error) {
        console.error("[Resume Upload] Critical error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to process resume. Please try again."
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
        try {
            await ResumeChunk.deleteMany({ candidateId: candidate._id || candidate.id });
        } catch (err) {}

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
        console.error("Delete resume error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete resume" });
    }
};

module.exports = {
    uploadResume,
    getResume,
    deleteResume
};
