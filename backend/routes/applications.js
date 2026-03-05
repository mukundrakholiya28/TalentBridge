const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
    applyToJob,
    getCandidateApplications,
    getRecruiterApplications,
    getApplicationsForJob,
    updateApplicationStatus
} = require("../controllers/applicationController");

const authMiddleware = require("../middleware/authMiddleware");

// Accept optional resume file upload (max 5MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});


// Candidate routes
router.post("/apply", authMiddleware, upload.single("resume"), applyToJob);
router.post("/", authMiddleware, upload.single("resume"), applyToJob); // alias

router.get("/my-applications", authMiddleware, getCandidateApplications);
router.get("/candidate", authMiddleware, getCandidateApplications); // alias

// Recruiter routes
router.get("/recruiter", authMiddleware, getRecruiterApplications);
router.get("/job/:jobId", authMiddleware, getApplicationsForJob);
router.put("/:id/status", authMiddleware, updateApplicationStatus);


module.exports = router;