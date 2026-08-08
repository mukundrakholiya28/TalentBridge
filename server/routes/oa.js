const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
    createAssessment,
    getCandidateAssessments,
    getAssessmentForCandidate,
    submitAssessment,
    logProctorEvent,
    logCodeSnapshot,
    getAssessmentResultsForRecruiter,
    getAssessmentCodeFeedForRecruiter,
    runCodingTests
} = require("../controllers/oaController");

// Recruiter
router.post("/assessments", authMiddleware, createAssessment);
router.get("/assessments/:id/results", authMiddleware, getAssessmentResultsForRecruiter);
router.get("/assessments/:id/code-feed", authMiddleware, getAssessmentCodeFeedForRecruiter);

// Candidate
router.get("/assessments/my", authMiddleware, getCandidateAssessments);
router.get("/assessments/:id", authMiddleware, getAssessmentForCandidate);
router.post("/assessments/:id/submit", authMiddleware, submitAssessment);
router.post("/assessments/:id/proctor", authMiddleware, logProctorEvent);
router.post("/assessments/:id/code-snapshot", authMiddleware, logCodeSnapshot);
router.post("/assessments/:id/run-tests", authMiddleware, runCodingTests);

module.exports = router;
