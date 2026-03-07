const mongoose = require("mongoose");

const AttemptAnswerSchema = new mongoose.Schema({
    questionIndex: { type: Number, required: true },
    answer: { type: String, default: "" }
}, { _id: false });

const TestCaseResultSchema = new mongoose.Schema({
    input: { type: String, default: "" },
    expectedOutput: { type: String, default: "" },
    actualOutput: { type: String, default: "" },
    passed: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false }
}, { _id: false });

const CodingAnswerSchema = new mongoose.Schema({
    questionIndex: { type: Number, required: true },
    code: { type: String, default: "" },
    language: { type: String, default: "" },
    testResults: { type: [TestCaseResultSchema], default: [] },
    passedAll: { type: Boolean, default: false },
    score: { type: Number, default: 0 }
}, { _id: false });

const ProctorEventSchema = new mongoose.Schema({
    type: { type: String, default: "tab-switch" },
    details: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const CodeSnapshotSchema = new mongoose.Schema({
    code: { type: String, default: "" },
    questionIndex: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const AssessmentAttemptSchema = new mongoose.Schema({
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment", required: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answers: { type: [AttemptAnswerSchema], default: [] },
    codingAnswers: { type: [CodingAnswerSchema], default: [] },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    submittedAt: { type: Date },
    status: { type: String, enum: ["in-progress", "submitted"], default: "in-progress" },
    proctorEvents: { type: [ProctorEventSchema], default: [] },
    tabSwitchCount: { type: Number, default: 0 },
    codeSnapshots: { type: [CodeSnapshotSchema], default: [] }
}, { timestamps: true });

AssessmentAttemptSchema.index({ assessmentId: 1, candidateId: 1 }, { unique: true });

module.exports = mongoose.model("AssessmentAttempt", AssessmentAttemptSchema);
