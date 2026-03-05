const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
    searchCandidates,
    matchCandidatesToJob,
    hybridSearchCandidates,
    rankCandidatesForJob
} = require("../controllers/atsController");

router.post("/search-candidates", authMiddleware, searchCandidates);
router.post("/hybrid-search", authMiddleware, hybridSearchCandidates);
router.get("/match-candidates/:jobId", authMiddleware, matchCandidatesToJob);
router.get("/rank/:jobId", authMiddleware, rankCandidatesForJob);

module.exports = router;