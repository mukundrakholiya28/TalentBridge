const Candidate = require("../models/Candidate");
const Job = require("../models/Job");
const { createEmbedding } = require("../utils/embedding");
const { calculateCandidateScore } = require("../utils/scoring");

/**
 * In-memory cosine similarity (fallback when Atlas vector indexes aren't available)
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
 * Semantic candidate search
 * Recruiter enters a query like:
 * "Python backend developer with machine learning experience"
 */
const searchCandidates = async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        // Convert recruiter query into embedding
        const queryEmbedding = await createEmbedding(query);

        // Fetch all candidates
        const candidates = await Candidate.find({});

        let queryLower = query.toLowerCase();

        const synonyms = {
            "ml": "machine learning",
            "ai": "artificial intelligence",
            "js": "javascript",
            "ts": "typescript",
            "aws": "amazon web services",
            "gcp": "google cloud",
            "nlp": "natural language processing",
            "cv": "computer vision",
            "ui": "user interface",
            "ux": "user experience",
            "devops": "development operations"
        };

        const searchTerms = [queryLower];
        queryLower.split(' ').forEach(word => {
            if (synonyms[word]) searchTerms.push(synonyms[word]);
        });

        const pattern = searchTerms.map(t => `\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).join('|');
        const keywordRegex = new RegExp(pattern, 'i');

        // In-memory cosine similarity search + keyword boost
        const scored = candidates.map(c => {
            const semanticScore = cosineSimilarity(queryEmbedding, c.embedding);

            let keywordBoost = 0;
            const skillSource = [...(c.skills || []), ...(c.technicalSkills || [])];
            if (skillSource.some(s => keywordRegex.test(s))) keywordBoost += 0.3;
            else if (keywordRegex.test(c.summary || "")) keywordBoost += 0.1;

            return {
                _id: c._id || c.id,
                userId: c.userId || "",
                name: c.name,
                email: c.email,
                phone: c.phone,
                skills: skillSource,
                location: c.location || "",
                summary: c.summary,
                score: semanticScore + keywordBoost
            };
        });

        const filtered = scored.filter(c => c.score > 0.15);
        filtered.sort((a, b) => b.score - a.score);

        res.status(200).json({
            success: true,
            results: filtered.slice(0, 10)
        });

    } catch (error) {
        console.error("Candidate search error:", error);
        res.status(500).json({
            success: false,
            message: "Candidate search failed"
        });
    }
};

/**
 * Match candidates to a specific job
 */
const matchCandidatesToJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await Job.findOne({ id: jobId });

        if (!job || !job.embedding || job.embedding.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Job or embedding not found"
            });
        }

        const candidates = await Candidate.find({});

        const scored = candidates.map(c => ({
            _id: c._id || c.id,
            userId: c.userId || "",
            name: c.name,
            email: c.email,
            skills: [...(c.skills || []), ...(c.technicalSkills || [])],
            location: c.location || "",
            summary: c.summary,
            score: cosineSimilarity(job.embedding, c.embedding)
        }));

        scored.sort((a, b) => b.score - a.score);

        res.status(200).json({
            success: true,
            results: scored.slice(0, 10)
        });

    } catch (error) {
        console.error("Job matching error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to match candidates"
        });
    }
};

/**
 * Hybrid search: semantic + skill/location filters
 */
const hybridSearchCandidates = async (req, res) => {
    try {
        const { query, skills, location } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: "Search query required"
            });
        }

        const queryEmbedding = await createEmbedding(query);

        let candidates = await Candidate.find({});

        // Filter by skills if requested
        if (skills && skills.length > 0) {
            const skillSet = new Set(skills.map(s => String(s).toLowerCase()));
            candidates = candidates.filter(c => {
                const allSkills = [...(c.skills || []), ...(c.technicalSkills || [])].map(s => String(s).toLowerCase());
                return allSkills.some(s => skillSet.has(s));
            });
        }

        // Filter by location if requested
        if (location) {
            const locLower = String(location).trim().toLowerCase();
            candidates = candidates.filter(c => String(c.location || "").toLowerCase().includes(locLower));
        }

        let queryLower = query.toLowerCase();

        const synonyms = {
            "ml": "machine learning",
            "ai": "artificial intelligence",
            "js": "javascript",
            "ts": "typescript",
            "aws": "amazon web services",
            "gcp": "google cloud",
            "nlp": "natural language processing",
            "cv": "computer vision",
            "ui": "user interface",
            "ux": "user experience",
            "devops": "development operations"
        };

        const searchTerms = [queryLower];
        queryLower.split(' ').forEach(word => {
            if (synonyms[word]) searchTerms.push(synonyms[word]);
        });

        const pattern = searchTerms.map(t => `\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).join('|');
        const keywordRegex = new RegExp(pattern, 'i');

        const scored = candidates.map(c => {
            const semanticScore = cosineSimilarity(queryEmbedding, c.embedding);

            let keywordBoost = 0;
            const skillSource = [...(c.skills || []), ...(c.technicalSkills || [])];
            if (skillSource.some(s => keywordRegex.test(s))) keywordBoost += 0.3;
            else if (keywordRegex.test(c.summary || "")) keywordBoost += 0.1;

            return {
                _id: c._id || c.id,
                userId: c.userId || "",
                name: c.name,
                email: c.email,
                skills: skillSource,
                location: c.location || "",
                summary: c.summary,
                score: semanticScore + keywordBoost
            };
        });

        const filtered = scored.filter(c => c.score > 0.15);
        filtered.sort((a, b) => b.score - a.score);

        res.json({
            success: true,
            results: filtered.slice(0, 10)
        });

    } catch (error) {
        console.error("Hybrid search error:", error);
        res.status(500).json({
            success: false,
            message: "Hybrid search failed"
        });
    }
};

/**
 * Rank candidates for a specific job using the multi-factor scoring system
 */
const rankCandidatesForJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await Job.findOne({ id: jobId });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        const candidates = await Candidate.find({});

        const rankedCandidates = candidates.map(candidate => {
            const scoreData = calculateCandidateScore(candidate, job);
            return {
                candidate: {
                    _id: candidate._id,
                    userId: candidate.user?.id || "",
                    name: candidate.name,
                    email: candidate.email,
                    skills: [...(candidate.skills || []), ...(candidate.technicalSkills || [])],
                    location: candidate.location || "",
                    summary: candidate.summary
                },
                score: scoreData.finalScore,
                breakdown: scoreData.breakdown
            };
        });

        rankedCandidates.sort((a, b) => b.score - a.score);

        res.json({
            success: true,
            results: rankedCandidates.slice(0, 10)
        });

    } catch (error) {
        console.error("Ranking error:", error);
        res.status(500).json({
            success: false,
            message: "Ranking failed"
        });
    }
};

module.exports = {
    searchCandidates,
    matchCandidatesToJob,
    hybridSearchCandidates,
    rankCandidatesForJob
};
