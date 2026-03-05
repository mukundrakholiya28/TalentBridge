const ResumeChunk = require("../models/ResumeChunk");
const Candidate = require("../models/Candidate");
const { createEmbedding } = require("../utils/embedding");

/**
 * In-memory cosine similarity (fallback for when Atlas vector indexes aren't available)
 */
const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * RAG Search across resume chunks
 * Uses in-memory cosine similarity for vector matching
 */
const searchResumeChunks = async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        const queryEmbedding = await createEmbedding(query);

        // Fetch all chunks with embeddings
        const chunks = await ResumeChunk.find({ embedding: { $exists: true, $ne: [] } });

        // Compute cosine similarity in-memory
        const scored = chunks.map(chunk => ({
            _id: chunk._id,
            candidateId: chunk.candidateId,
            text: chunk.text,
            type: chunk.type,
            score: cosineSimilarity(queryEmbedding, chunk.embedding)
        }));

        scored.sort((a, b) => b.score - a.score);

        const topChunks = scored.slice(0, 10);

        // Enrich with candidate info
        const results = [];
        for (const chunk of topChunks) {
            const candidate = await Candidate.findById(chunk.candidateId);
            results.push({
                candidateName: candidate ? candidate.name : "Unknown",
                candidateEmail: candidate ? candidate.email : "",
                chunkText: chunk.text,
                type: chunk.type,
                score: chunk.score
            });
        }

        res.json({
            success: true,
            results
        });

    } catch (error) {
        console.error("RAG search error:", error);
        res.status(500).json({
            success: false,
            message: "RAG search failed"
        });
    }
};

module.exports = {
    searchResumeChunks
};