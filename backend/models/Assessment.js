const mongoose = require("mongoose");

const AssessmentQuestionSchema = new mongoose.Schema({
    prompt: { type: String, required: true },
    options: { type: [String], default: [] },
    correctAnswer: { type: String, required: true },
    points: { type: Number, default: 1 }
}, { _id: false });

const TestCaseSchema = new mongoose.Schema({
    input: { type: String, default: "" },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false }
}, { _id: false });

const CodingQuestionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    problemStatement: { type: String, required: true },
    language: { type: String, default: "javascript" },
    starterCode: { type: String, default: "" },
    testCases: { type: [TestCaseSchema], default: [] },
    points: { type: Number, default: 10 }
}, { _id: false });

const AssessmentSchema = new mongoose.Schema({
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    title: { type: String, required: true },
    instructions: { type: String, default: "" },
    durationMinutes: { type: Number, default: 60 },
    dueDate: { type: Date },
    questions: { type: [AssessmentQuestionSchema], default: [] },
    codingQuestions: { type: [CodingQuestionSchema], default: [] },
    totalPoints: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "closed"], default: "active" }
}, { timestamps: true });

module.exports = mongoose.model("Assessment", AssessmentSchema);
