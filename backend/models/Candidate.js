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

const ProjectSchema = new mongoose.Schema({
    name: String,
    description: String
});

const CandidateSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    githubUrl: String,
    linkedinUrl: String,
    title: String,
    location: String,
    technicalSkills: [String],
    skills: [String],
    experience: [ExperienceSchema],
    education: [EducationSchema],
    projects: [ProjectSchema],
    extraCurricular: [String],
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
