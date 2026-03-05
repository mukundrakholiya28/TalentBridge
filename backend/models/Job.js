const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema({

  id: {
    type: String,
    required: true
  },

  recruiterId: {
    type: String,
    required: true
  },

  title: {
    type: String,
    required: true
  },

  company: String,

  location: String,

  type: String,

  description: String,

  requirements: {
    type: [String],
    default: []
  },

  benefits: {
    type: [String],
    default: []
  },

  salaryMin: Number,

  salaryMax: Number,

  /**
   * Extracted structured job fields
   */
  skills: {
    type: [String],
    default: []
  },

  experienceRequired: {
    type: Number,
    default: 0
  },

  education: {
    type: String,
    default: ""
  },

  summary: {
    type: String,
    default: ""
  },

  /**
   * Vector embedding for semantic search
   */
  embedding: {
    type: [Number],
    default: []
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Job", JobSchema);