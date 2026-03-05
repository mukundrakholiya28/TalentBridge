const mongoose = require('mongoose');

const ExperienceSchema = new mongoose.Schema({
    title: String,
    company: String,
    period: String,
    description: String
});

const EducationSchema = new mongoose.Schema({
    degree: String,
    institution: String,
    year: String
});

const CandidateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    skills: [String],
    experience: [ExperienceSchema],
    education: [EducationSchema],
    summary: String,
    resumeText: { type: String, default: '' },
    resumePath: String,
    embedding: {
        type: [Number],
        default: []
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Candidate', CandidateSchema);