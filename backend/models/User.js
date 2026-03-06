const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Replicates standard UID
    email: { type: String, required: true, unique: true },
    username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    password: { type: String }, // Hashed password
    userType: { type: String, enum: ['candidate', 'recruiter'], required: true },
    fullName: { type: String, required: true },
    phone: { type: String },
    companyName: { type: String },
    companyDescription: { type: String },
    avatarUrl: { type: String },
    // Google OAuth tokens (if user connects via Google OAuth)
    google: {
        accessToken: String,
        refreshToken: String,
        scope: String,
        tokenExpiry: Date
    },
    title: { type: String },
    location: { type: String },
    resumeUrl: { type: String },
    skills: [{ type: String }],
    bio: { type: String },
    // Resume Parsing sub-schemas
    experience: [{
        title: String,
        company: String,
        period: String,
        description: String
    }],
    education: [{
        degree: String,
        institution: String,
        year: String
    }],
    projects: [{
        name: String,
        description: String
    }],
    extraCurricular: [{ type: String }],
    technicalSkills: [{ type: String }],
    githubUrl: { type: String },
    linkedinUrl: { type: String },
    portfolioUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
