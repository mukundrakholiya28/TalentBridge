const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
    sendOffer,
    getRecruiterOffers,
    getCandidateOffers,
    respondToOffer
} = require("../controllers/offerController");

// Recruiter
router.post("/send", authMiddleware, sendOffer);
router.get("/recruiter", authMiddleware, getRecruiterOffers);

// Candidate
router.get("/candidate", authMiddleware, getCandidateOffers);
router.put("/:id/respond", authMiddleware, respondToOffer);

module.exports = router;
