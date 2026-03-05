const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({

    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Application",
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

    position: { type: String, required: true },
    salary: { type: String, required: true },
    startDate: { type: String },
    benefits: { type: String },
    workLocation: { type: String },
    workType: { type: String, default: "Full-time" },
    probationPeriod: { type: String, default: "3 months" },
    joiningBonus: { type: String },
    additionalNotes: { type: String },

    status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "negotiating"],
        default: "pending"
    },

    counterOffer: {
        salary: String,
        startDate: String,
        message: String
    },

    sentDate: { type: Date, default: Date.now },
    responseDate: { type: Date }

}, { timestamps: true });

module.exports = mongoose.model("Offer", OfferSchema);
