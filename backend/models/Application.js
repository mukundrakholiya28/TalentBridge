const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema({

    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: true
    },

    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    recruiterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    coverLetter: String,

    portfolio: String,

    linkedin: String,

    availableFrom: Date,

    resumeFileName: String,

    status: {
        type: String,
        default: "Pending"
    },

    statusHistory: [{
        from: { type: String, default: "" },
        to: { type: String, required: true },
        changedBy: { type: String, default: "" }, // JWT user.id (UUID string)
        note: { type: String, default: "" },
        changedAt: { type: Date, default: Date.now }
    }],

    // Interview & Assessment links (set by recruiter)
    interviewLink: { type: String, default: "" },
    interviewDate: { type: Date },
    interviewType: { type: String, enum: ["video", "phone", "in-person"], default: "video" },

    assessmentLink: { type: String, default: "" },
    assessmentDueDate: { type: Date },
    assessmentTitle: { type: String, default: "" }

}, { timestamps: true });

module.exports = mongoose.model("Application", ApplicationSchema);
