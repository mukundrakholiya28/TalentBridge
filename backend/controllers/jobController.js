const Job = require("../models/Job");
const { v4: uuidv4 } = require("uuid");
const { createEmbedding } = require("../utils/embedding");

/**
 * CREATE JOB — also generates embedding for semantic search
 */
const createJob = async (req, res) => {
    try {
        const recruiterId = req.user.id;
        const { title, company, location, type, description, requirements, benefits, salaryMin, salaryMax, skills, experience, education } = req.body;

        // Generate embedding (graceful fallback if model not ready)
        let embedding = [];
        try {
            const combinedText = `${title} ${description || ""} ${Array.isArray(requirements) ? requirements.join(" ") : (requirements || "")}`;
            embedding = await createEmbedding(combinedText);
        } catch (embError) {
            console.warn("Embedding generation skipped:", embError.message);
        }

        const newJob = new Job({
            id: uuidv4(),
            recruiterId,
            title,
            company,
            location,
            type,
            description,
            requirements: Array.isArray(requirements) ? requirements : (requirements || "").split("\n").map(r => r.trim()).filter(Boolean),
            benefits: benefits || [],
            salaryMin: salaryMin || 0,
            salaryMax: salaryMax || 0,
            skills: Array.isArray(skills) ? skills : (skills || "").split(",").map(s => s.trim()).filter(Boolean),
            embedding
        });

        const savedJob = await newJob.save();
        res.status(201).json(savedJob);

    } catch (error) {
        console.error("Create Job Error:", error);
        res.status(500).json({ success: false, message: "Failed to create job" });
    }
};


/**
 * GET ALL JOBS (Candidate side) — returns plain array
 */
const getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 });
        res.status(200).json(jobs);
    } catch (error) {
        console.error("Fetch Jobs Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch jobs" });
    }
};


/**
 * GET JOB BY ID
 */
const getJobById = async (req, res) => {
    try {
        const { id } = req.params;
        let job = await Job.findOne({ id });
        if (!job) {
            try { job = await Job.findById(id); } catch (_) { }
        }
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }
        res.status(200).json({ success: true, job });
    } catch (error) {
        console.error("Get job error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch job" });
    }
};


/**
 * SEMANTIC JOB SEARCH
 * In-memory cosine similarity + keyword/abbreviation boosting
 */
const semanticSearchJobs = async (req, res) => {
    try {
        const { query, location } = req.body;

        if (!query) {
            return res.status(400).json({ success: false, message: "Search query required" });
        }

        const queryEmbedding = await createEmbedding(query);

        // Fetch jobs with optional location filter
        let filter = { embedding: { $exists: true, $ne: [] } };
        if (location && location.trim() !== '') {
            filter.location = new RegExp(location.trim(), 'i');
        }
        const jobs = await Job.find(filter);

        // Cosine similarity
        const cosineSimilarity = (a, b) => {
            if (!a || !b || a.length !== b.length) return 0;
            let dot = 0, normA = 0, normB = 0;
            for (let i = 0; i < a.length; i++) {
                dot += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }
            return dot / (Math.sqrt(normA) * Math.sqrt(normB));
        };

        let queryLower = query.toLowerCase();

        // Tech abbreviation synonym map
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

        const scored = jobs.map(job => {
            const semanticScore = cosineSimilarity(queryEmbedding, job.embedding);

            let keywordBoost = 0;
            if (keywordRegex.test(job.title)) keywordBoost += 0.4;
            else if (job.requirements && job.requirements.some(r => keywordRegex.test(r))) keywordBoost += 0.2;
            else if (keywordRegex.test(job.description || "")) keywordBoost += 0.1;

            return {
                ...job.toObject(),
                score: semanticScore + keywordBoost
            };
        });

        const filtered = scored.filter(j => j.score > 0.15);
        filtered.sort((a, b) => b.score - a.score);

        const results = filtered.slice(0, 10).map(({ embedding, ...rest }) => rest);

        res.status(200).json({ success: true, results });

    } catch (error) {
        console.error("Semantic search error:", error);
        res.status(500).json({ success: false, message: "Semantic search failed" });
    }
};


/**
 * GET JOBS POSTED BY RECRUITER — returns plain array
 */
const getRecruiterJobs = async (req, res) => {
    try {
        const recruiterId = req.user.id;
        const jobs = await Job.find({ recruiterId }).sort({ createdAt: -1 });
        res.status(200).json(jobs);
    } catch (error) {
        console.error("Recruiter Jobs Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch recruiter jobs" });
    }
};


/**
 * DELETE JOB — tries UUID `id` first, falls back to MongoDB _id
 */
const deleteJob = async (req, res) => {
    try {
        const recruiterId = req.user.id;
        const jobId = req.params.id;

        let job = await Job.findOne({ id: jobId });
        if (!job) {
            try { job = await Job.findById(jobId); } catch (_) { }
        }

        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        if (job.recruiterId !== recruiterId) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        if (job.id) {
            await Job.deleteOne({ id: job.id });
        } else {
            await Job.findByIdAndDelete(job._id);
        }

        res.status(200).json({ success: true, message: "Job deleted successfully" });

    } catch (error) {
        console.error("Delete Job Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete job" });
    }
};


module.exports = { createJob, getAllJobs, getJobById, semanticSearchJobs, getRecruiterJobs, deleteJob };