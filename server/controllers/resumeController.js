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
    const legacyFn =
        typeof pdfParseLib === "function"
            ? pdfParseLib
            : (typeof pdfParseLib.default === "function" ? pdfParseLib.default : null);

    if (legacyFn) {
        return legacyFn(buffer);
    }

    if (typeof pdfParseLib.PDFParse === "function") {
        const parser = new pdfParseLib.PDFParse({ data: buffer });
        try {
            return await parser.getText();
        } finally {
            await parser.destroy().catch(() => {});
        }
    }

    throw new Error("Unsupported pdf-parse export format");
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
    const user = await User.findOne({ id: req.user.id });
    if (!user) return { error: { code: 404, message: "User not found" } };
    if (user.userType !== "candidate") return { error: { code: 403, message: "Not a candidate account" } };

    let candidate = await Candidate.findOne({ userId: user.id });
    if (!candidate) {
        candidate = await Candidate.create({
            userId: user.id,
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
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Resume file is required" });
        }

        const context = await getCandidateContext(req);
        if (context.error) {
            return res.status(context.error.code).json({ success: false, message: context.error.message });
        }

        const { user, candidate } = context;
        const pdfData = await parsePdfBuffer(req.file.buffer);
        const rawText = String(extractPdfText(pdfData) || "");
        const formattedText = buildFormattedText(rawText);
        const cleanedText = cleanText(rawText);

        if (!cleanedText) {
            return res.status(400).json({ success: false, message: "Could not extract text from resume" });
        }

        let structuredData = {};
        try {
            structuredData = await analyzeResume(formattedText || cleanedText, PROFILE_REQUIREMENTS);
        } catch (err) {
            console.warn("AI resume analysis failed, using fallback extraction:", err.message);
            structuredData = fallbackExtract(formattedText || cleanedText);
        }

        const sectionFallback = extractSectionsFallback(formattedText || cleanedText);
        if (!Array.isArray(structuredData.experience) || structuredData.experience.length === 0) {
            structuredData.experience = sectionFallback.experience;
        }
        if (!Array.isArray(structuredData.education) || structuredData.education.length === 0) {
            structuredData.education = sectionFallback.education;
        }
        if (!Array.isArray(structuredData.projects) || structuredData.projects.length === 0) {
            structuredData.projects = sectionFallback.projects;
        }
        if (!Array.isArray(structuredData.extraCurricular) || structuredData.extraCurricular.length === 0) {
            structuredData.extraCurricular = sectionFallback.extraCurricular;
        }

        let embedding = [];
        try {
            embedding = await createEmbedding(cleanedText);
        } catch (err) {
            console.warn("Resume embedding failed:", err.message);
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
        // Always keep profile email equal to signed-in account email.
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
        candidate.resumeText = cleanedText;
        candidate.resumePath = req.file.originalname || "";
        candidate.embedding = embedding;
        await candidate.save();

        user.fullName = candidate.name || user.fullName;
        // Keep user email authoritative for all profile views.
        candidate.email = user.email || candidate.email || "";
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
        await user.save();

        await ResumeChunk.deleteMany({ candidateId: candidate._id });

        let chunks = chunkResume({
            summary: candidate.summary || "",
            skills: candidate.skills || [],
            experience: candidate.experience || [],
            education: candidate.education || [],
            projects: candidate.projects || []
        });

        if (!Array.isArray(chunks) || chunks.length === 0) {
            chunks = [{ type: "summary", text: cleanedText }];
        }

        for (const chunk of chunks) {
            const chunkText = cleanText(chunk.text || "");
            if (!chunkText) continue;

            let chunkEmbedding = [];
            try {
                chunkEmbedding = await createEmbedding(chunkText);
            } catch (err) {
                console.warn("Chunk embedding failed:", err.message);
            }

            await ResumeChunk.create({
                candidateId: candidate._id,
                text: chunkText,
                type: chunk.type,
                embedding: chunkEmbedding
            });
        }

        return res.status(200).json({
            success: true,
            message: "Resume uploaded and profile updated",
            candidate
        });
    } catch (error) {
        console.error("Resume upload error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to process resume"
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
