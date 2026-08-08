const Candidate = require("../models/Candidate");
const Job = require("../models/Job");
const { evaluateCandidate } = require("../utils/candidateEvaluator");

const evaluateCandidateForJob = async (req, res) => {

  try {

    const { candidateId, jobId } = req.params;

    const candidate = await Candidate.findById(candidateId);
    const job = await Job.findOne({ id: jobId });

    if (!candidate || !job) {
      return res.status(404).json({
        success: false,
        message: "Candidate or Job not found"
      });
    }

    const evaluation = await evaluateCandidate(candidate, job);

    res.json({
      success: true,
      candidate: candidate.name,
      job: job.title,
      evaluation
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Evaluation failed"
    });

  }

};

module.exports = {
  evaluateCandidateForJob
};