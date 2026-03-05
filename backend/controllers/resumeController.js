const pdfParse = require("pdf-parse");

const Candidate = require("../models/Candidate");
const ResumeChunk = require("../models/ResumeChunk");

const { createEmbedding } = require("../utils/embedding");
const { analyzeResume } = require("../utils/resumeAnalyzer");
const { chunkResume } = require("../utils/resumeChunker");

/**
 * Upload Resume
 * Complete pipeline:
 * PDF → text → AI analysis → candidate profile
 * → embedding → chunking → chunk embeddings
 */
const uploadResume = async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Resume file is required"
            });
        }

        const candidateId = req.user.id;

        /**
         * Step 1 — Parse PDF
         */
        const pdfData = await pdfParse(req.file.buffer);

        let rawText = pdfData.text;

        if (!rawText || rawText.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Could not extract text from resume"
            });
        }

        /**
         * Step 2 — Clean text
         */
        const cleanedText = rawText
            .replace(/\s+/g, " ")
            .replace(/\n/g, " ")
            .trim();

        console.log("Resume text extracted:", cleanedText.slice(0, 200));

        /**
         * Step 3 — AI Resume Analysis
         */
        const structuredData = await analyzeResume(cleanedText);

        console.log("Structured resume:", structuredData);

        /**
         * Step 4 — Generate main embedding
         */
        const embedding = await createEmbedding(cleanedText);

        /**
         * Step 5 — Update candidate profile
         */
        const candidate = await Candidate.findByIdAndUpdate(
            candidateId,
            {
                name: structuredData?.name || undefined,
                skills: structuredData?.skills || [],
                experience: structuredData?.experience || [],
                education: structuredData?.education || [],
                summary: structuredData?.summary || "",
                resumeText: cleanedText,
                embedding: embedding
            },
            { new: true }
        );

        /**
         * Step 6 — Delete previous chunks
         */
        await ResumeChunk.deleteMany({ candidateId });

        /**
         * Step 7 — Split resume into chunks
         */
        let chunks = chunkResume(structuredData);

        console.log("STRUCTURED DATA:", structuredData);
        console.log("CHUNKS:", chunks);

        if (!chunks || chunks.length === 0) {
            chunks = [
                {
                    type: "full_resume",
                    text: cleanedText
                }
            ];
        }
        for (const chunk of chunks) {

            console.log("Saving chunk:", chunk);

            const chunkEmbedding = await createEmbedding(chunk.text);

            await ResumeChunk.create({
                candidateId: candidateId,
                text: chunk.text,
                type: chunk.type,
                embedding: chunkEmbedding
            });

        }

        res.status(200).json({
            success: true,
            message: "Resume uploaded, analyzed, and indexed successfully",
            candidate
        });

    } catch (error) {

        console.error("Resume upload error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to process resume"
        });

    }

};



/**
 * Get Candidate Resume
 */
const getResume = async (req, res) => {

    try {

        const candidateId = req.user.id;

        const candidate = await Candidate.findById(candidateId);

        if (!candidate || !candidate.resumeText) {
            return res.status(404).json({
                success: false,
                message: "Resume not found"
            });
        }

        res.status(200).json({
            success: true,
            resume: candidate.resumeText
        });

    } catch (error) {

        console.error("Get resume error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve resume"
        });

    }

};



/**
 * Delete Resume
 */
const deleteResume = async (req, res) => {

    try {

        const candidateId = req.user.id;

        await ResumeChunk.deleteMany({ candidateId });

        const candidate = await Candidate.findByIdAndUpdate(
            candidateId,
            {
                resumeText: "",
                embedding: [],
                skills: [],
                experience: [],
                education: [],
                summary: ""
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Resume deleted successfully",
            candidate
        });

    } catch (error) {

        console.error("Delete resume error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete resume"
        });

    }

};



module.exports = {
    uploadResume,
    getResume,
    deleteResume
};