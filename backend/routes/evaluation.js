const express = require("express");
const router = express.Router();

const {
  evaluateCandidateForJob
} = require("../controllers/evaluationController");

router.get("/:candidateId/:jobId", evaluateCandidateForJob);

module.exports = router;