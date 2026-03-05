const mongoose = require("mongoose");

const ResumeChunkSchema = new mongoose.Schema({

  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Candidate",
    required: true
  },

  text: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ["summary", "skills", "experience", "project", "education"],
    default: "experience"
  },

  embedding: {
    type: [Number],
    default: []
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("ResumeChunk", ResumeChunkSchema);