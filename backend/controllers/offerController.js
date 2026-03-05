const Offer = require("../models/Offer");
const Application = require("../models/Application");
const User = require("../models/User");


/**
 * RECRUITER — Send an offer letter
 */
const sendOffer = async (req, res) => {
    try {
        const recruiterId = req.user.id;
        const {
            applicationId,
            position,
            salary,
            startDate,
            benefits,
            workLocation,
            workType,
            probationPeriod,
            joiningBonus,
            additionalNotes
        } = req.body;

        if (!applicationId || !position || !salary) {
            return res.status(400).json({ success: false, message: "applicationId, position, and salary are required" });
        }

        const application = await Application.findById(applicationId)
            .populate("candidateId")
            .populate("jobId");

        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        const recruiterUser = await User.findOne({ id: recruiterId });
        if (!recruiterUser) {
            return res.status(404).json({ success: false, message: "Recruiter not found" });
        }

        const offer = await Offer.create({
            applicationId: application._id,
            candidateId: application.candidateId._id || application.candidateId,
            recruiterId: recruiterUser._id,
            position,
            salary,
            startDate,
            benefits,
            workLocation,
            workType,
            probationPeriod,
            joiningBonus,
            additionalNotes,
            status: "pending",
            sentDate: new Date()
        });

        // Update application status to "Offer Extended"
        application.status = "Offer Extended";
        await application.save();

        res.status(201).json({ success: true, offer });

    } catch (error) {
        console.error("Send Offer Error:", error);
        res.status(500).json({ success: false, message: "Failed to send offer" });
    }
};


/**
 * RECRUITER — Get all offers sent by this recruiter
 */
const getRecruiterOffers = async (req, res) => {
    try {
        const recruiterUser = await User.findOne({ id: req.user.id });
        if (!recruiterUser) {
            return res.json({ success: true, offers: [] });
        }

        const offers = await Offer.find({ recruiterId: recruiterUser._id })
            .populate("candidateId", "fullName email")
            .populate("applicationId")
            .sort({ createdAt: -1 });

        const mapped = offers.map(o => ({
            id: o._id.toString(),
            candidateName: o.candidateId?.fullName || "Unknown",
            candidateEmail: o.candidateId?.email || "",
            candidateId: o.candidateId?._id?.toString() || "",
            position: o.position,
            salary: o.salary,
            startDate: o.startDate || "",
            status: o.status,
            sentDate: new Date(o.sentDate || o.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            responseDate: o.responseDate ? new Date(o.responseDate).toLocaleDateString() : null,
            counterOffer: o.counterOffer || null
        }));

        res.json({ success: true, offers: mapped });

    } catch (error) {
        console.error("Get Offers Error:", error);
        res.json({ success: true, offers: [] });
    }
};


/**
 * CANDIDATE — Get offers received
 */
const getCandidateOffers = async (req, res) => {
    try {
        const candidateUser = await User.findOne({ id: req.user.id });
        if (!candidateUser) {
            return res.json({ success: true, offers: [] });
        }

        const offers = await Offer.find({ candidateId: candidateUser._id })
            .populate("recruiterId", "fullName companyName")
            .sort({ createdAt: -1 });

        res.json({ success: true, offers });
    } catch (error) {
        console.error("Get Candidate Offers Error:", error);
        res.json({ success: true, offers: [] });
    }
};


/**
 * CANDIDATE — Respond to an offer (accept/reject/counter)
 */
const respondToOffer = async (req, res) => {
    try {
        const { status, counterOffer } = req.body;
        const offer = await Offer.findById(req.params.id);

        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        offer.status = status; // 'accepted', 'rejected', 'negotiating'
        offer.responseDate = new Date();
        if (counterOffer) {
            offer.counterOffer = counterOffer;
        }
        await offer.save();

        // If accepted, update application status too
        if (status === "accepted") {
            await Application.findByIdAndUpdate(offer.applicationId, { status: "Offer Accepted" });
        } else if (status === "rejected") {
            await Application.findByIdAndUpdate(offer.applicationId, { status: "Offer Declined" });
        }

        res.json({ success: true, offer });
    } catch (error) {
        console.error("Respond Offer Error:", error);
        res.status(500).json({ success: false, message: "Failed to respond to offer" });
    }
};


module.exports = { sendOffer, getRecruiterOffers, getCandidateOffers, respondToOffer };
