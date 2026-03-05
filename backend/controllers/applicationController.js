const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");
const mongoose = require("mongoose");


/**
 * CANDIDATE — Apply to a job
 * Works with both JSON body and multipart/form-data
 */
const applyToJob = async (req, res) => {
    try {
        const candidateId = req.user.id; // UUID string from JWT

        const { jobId, coverLetter, portfolio, linkedin, availableFrom } = req.body;

        if (!jobId) {
            return res.status(400).json({ success: false, message: "Job ID required" });
        }

        // Find job by custom UUID `id` OR by MongoDB _id
        let job = await Job.findOne({ id: jobId });
        if (!job && mongoose.Types.ObjectId.isValid(jobId)) {
            job = await Job.findById(jobId);
        }

        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        // Find candidate user by UUID `id`
        const candidateUser = await User.findOne({ id: candidateId });
        if (!candidateUser) {
            return res.status(404).json({ success: false, message: "Candidate not found" });
        }

        // Find recruiter user by UUID `id` stored on the job
        const recruiterUser = await User.findOne({ id: job.recruiterId });
        if (!recruiterUser) {
            return res.status(404).json({ success: false, message: "Recruiter not found" });
        }

        // Prevent duplicate applications (allow re-apply only if previous was rejected)
        const existingApp = await Application.findOne({
            jobId: job._id,
            candidateId: candidateUser._id
        });
        if (existingApp) {
            const status = (existingApp.status || '').toLowerCase();
            if (status === 'rejected' || status === 'offer declined' || status === 'offer-declined') {
                // Previous was rejected — delete it so they can re-apply
                await Application.deleteOne({ _id: existingApp._id });
            } else {
                return res.status(400).json({ success: false, message: "You have already applied to this job" });
            }
        }

        const application = await Application.create({
            jobId: job._id,
            candidateId: candidateUser._id,
            recruiterId: recruiterUser._id,
            coverLetter: coverLetter || "",
            portfolio: portfolio || "",
            linkedin: linkedin || "",
            availableFrom: availableFrom || null,
            resumeFileName: req.file ? req.file.originalname : null,
            status: "Pending"
        });

        res.status(201).json({ success: true, application });

    } catch (error) {
        console.error("Apply Job Error:", error);
        res.status(500).json({ success: false, message: "Application failed" });
    }
};


/**
 * CANDIDATE — Get their own applications (populated with job titles)
 */
const getCandidateApplications = async (req, res) => {
    try {
        const candidateUser = await User.findOne({ id: req.user.id });
        if (!candidateUser) {
            return res.status(404).json({ success: false, message: "Candidate not found" });
        }

        const applications = await Application.find({ candidateId: candidateUser._id })
            .populate("jobId", "title company location type id")
            .populate("recruiterId", "fullName companyName id")
            .sort({ createdAt: -1 });

        const mapped = applications.map(app => ({
            _id: app._id,
            id: app._id.toString(),
            jobId: app.jobId?._id?.toString() || app.jobId?.toString() || "",
            jobTitle: app.jobId?.title || "Position",
            company: app.jobId?.company || "Company",
            location: app.jobId?.location || "",
            status: app.status || "Pending",
            coverLetter: app.coverLetter || "",
            createdAt: app.createdAt,
            appliedAt: app.createdAt,
            recruiterId: app.recruiterId?.id || app.recruiterId?._id?.toString() || "",
            recruiterName: app.recruiterId?.fullName || "",
            interviewLink: app.interviewLink || "",
            interviewDate: app.interviewDate || null,
            interviewType: app.interviewType || "video",
            assessmentLink: app.assessmentLink || "",
            assessmentDueDate: app.assessmentDueDate || null,
            assessmentTitle: app.assessmentTitle || "",
        }));

        res.json(mapped);
    } catch (error) {
        console.error("Candidate Applications Error:", error);
        res.status(500).json([]);
    }
};


/**
 * RECRUITER — Get all applications across their jobs (populated)
 */
const getRecruiterApplications = async (req, res) => {
    try {
        const recruiterUser = await User.findOne({ id: req.user.id });
        if (!recruiterUser) {
            return res.status(404).json([]);
        }

        const applications = await Application.find({ recruiterId: recruiterUser._id })
            .populate("candidateId", "fullName email phone skills")
            .populate("jobId", "title company")
            .sort({ createdAt: -1 });

        // RecruiterDashboard.tsx expects a plain array with these fields
        const mapped = applications.map(app => ({
            id: app._id.toString(),
            _id: app._id,
            jobId: app.jobId?._id?.toString() || "",
            candidateId: app.candidateId?._id?.toString() || "",
            status: app.status || "Pending",
            appliedAt: app.createdAt,
            createdAt: app.createdAt,
            coverLetter: app.coverLetter || "",
            candidateName: app.candidateId?.fullName || "Unknown Candidate",
            position: app.jobId?.title || "Unknown Job",
            appliedDate: new Date(app.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            jobTitle: app.jobId?.title || "Unknown Job",
            candidate: {
                fullName: app.candidateId?.fullName || "Unknown Candidate",
                email: app.candidateId?.email || "",
                phone: app.candidateId?.phone || "",
                profile: {
                    skills: app.candidateId?.skills || [],
                }
            }
        }));

        res.json(mapped);
    } catch (error) {
        console.error("Recruiter Applications Error:", error);
        res.status(500).json([]);
    }
};


/**
 * RECRUITER — Get applications for a specific job
 */
const getApplicationsForJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const recruiterUser = await User.findOne({ id: req.user.id });

        let job = await Job.findOne({ id: jobId });
        if (!job && mongoose.Types.ObjectId.isValid(jobId)) {
            job = await Job.findById(jobId);
        }

        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        const applications = await Application.find({ jobId: job._id })
            .populate("candidateId", "fullName email phone skills")
            .sort({ createdAt: -1 });

        const mapped = applications.map(app => ({
            id: app._id.toString(),
            _id: app._id,
            jobId: job._id.toString(),
            candidateId: app.candidateId?._id?.toString() || "",
            status: app.status || "Pending",
            appliedAt: app.createdAt,
            coverLetter: app.coverLetter || "",
            candidate: {
                fullName: app.candidateId?.fullName || "Unknown",
                email: app.candidateId?.email || "",
                phone: app.candidateId?.phone || "",
                profile: {
                    skills: app.candidateId?.skills || [],
                }
            }
        }));

        res.json(mapped);
    } catch (error) {
        console.error("Applications For Job Error:", error);
        res.status(500).json({ success: false });
    }
};


/**
 * RECRUITER — Update application status and optional interview/assessment links
 */
const updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, interviewLink, interviewDate, interviewType, assessmentLink, assessmentDueDate, assessmentTitle } = req.body;

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        if (status) application.status = status;
        if (interviewLink !== undefined) application.interviewLink = interviewLink;
        if (interviewDate !== undefined) application.interviewDate = interviewDate;
        if (interviewType !== undefined) application.interviewType = interviewType;
        if (assessmentLink !== undefined) application.assessmentLink = assessmentLink;
        if (assessmentDueDate !== undefined) application.assessmentDueDate = assessmentDueDate;
        if (assessmentTitle !== undefined) application.assessmentTitle = assessmentTitle;

        await application.save();

        res.json({ success: true, application });
    } catch (error) {
        console.error("Update Status Error:", error);
        res.status(500).json({ success: false });
    }
};


module.exports = {
    applyToJob,
    getCandidateApplications,
    getRecruiterApplications,
    getApplicationsForJob,
    updateApplicationStatus
};