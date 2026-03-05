const express = require("express");
const router = express.Router();

const {
    createJob,
    getAllJobs,
    getJobById,
    semanticSearchJobs,
    getRecruiterJobs,
    deleteJob
} = require("../controllers/jobController");

const authMiddleware = require("../middleware/authMiddleware");


// Public routes
router.get("/", getAllJobs);

// Protected non-parameterized routes (MUST be before /:id)
router.get("/recruiter", authMiddleware, getRecruiterJobs);
router.post("/create", authMiddleware, createJob);
router.post("/semantic-search", authMiddleware, semanticSearchJobs);

// Parameterized routes (always last)
router.get("/:id", getJobById);
router.delete("/:id", authMiddleware, deleteJob);


module.exports = router;