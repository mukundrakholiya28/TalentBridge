const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");
const mongoose = require("mongoose");
const {
    createCalendarEventForUser,
    createInterviewEventWithFallback,
    buildInterviewEvent,
    buildAssessmentEvent
} = require("../utils/googleCalendar");

const pushStatusHistory = (application, { from, to, changedBy, note }) => {
    if (!application || !to) return;
    if (!Array.isArray(application.statusHistory)) application.statusHistory = [];
    application.statusHistory.push({
        from: from || "",
        to,
        changedBy: changedBy || "",
        note: note || "",
        changedAt: new Date()
    });
};


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
        if (job.isOpen === false) {
            return res.status(400).json({ success: false, message: "This job position is closed" });
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
            status: "Pending",
            statusHistory: [{
                from: "",
                to: "Pending",
                changedBy: candidateId,
                note: "Application submitted",
                changedAt: new Date()
            }]
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
            statusHistory: Array.isArray(app.statusHistory) ? app.statusHistory : [],
            auditLog: (Array.isArray(app.statusHistory) ? app.statusHistory : []).map((h) => ({
                status: h?.to || app.status || "Pending",
                timestamp: h?.changedAt || app.createdAt
            })),
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
            statusHistory: Array.isArray(app.statusHistory) ? app.statusHistory : [],
            auditLog: (Array.isArray(app.statusHistory) ? app.statusHistory : []).map((h) => ({
                status: h?.to || app.status || "Pending",
                timestamp: h?.changedAt || app.createdAt
            })),
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
            },
            interviewLink: app.interviewLink || "",
            interviewDate: app.interviewDate || null,
            interviewType: app.interviewType || "video",
            assessmentLink: app.assessmentLink || "",
            assessmentDueDate: app.assessmentDueDate || null,
            assessmentTitle: app.assessmentTitle || ""
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
            statusHistory: Array.isArray(app.statusHistory) ? app.statusHistory : [],
            auditLog: (Array.isArray(app.statusHistory) ? app.statusHistory : []).map((h) => ({
                status: h?.to || app.status || "Pending",
                timestamp: h?.changedAt || app.createdAt
            })),
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
            },
            interviewLink: app.interviewLink || "",
            interviewDate: app.interviewDate || null,
            interviewType: app.interviewType || "video",
            assessmentLink: app.assessmentLink || "",
            assessmentDueDate: app.assessmentDueDate || null,
            assessmentTitle: app.assessmentTitle || ""
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

        const application = await Application.findById(id).populate("jobId", "title company");
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        const recruiterUser = await User.findOne({ id: req.user.id });
        if (!recruiterUser) {
            return res.status(404).json({ success: false, message: "Recruiter not found" });
        }

        if (!application.recruiterId.equals(recruiterUser._id)) {
            return res.status(403).json({ success: false, message: "Not authorized for this application" });
        }

        const candidateUser = await User.findById(application.candidateId);
        if (!candidateUser) {
            return res.status(404).json({ success: false, message: "Candidate not found" });
        }

        const previousStatus = application.status || "";
        if (status) {
            application.status = status;
            if (status !== previousStatus) {
                pushStatusHistory(application, {
                    from: previousStatus,
                    to: status,
                    changedBy: req.user.id,
                    note: "Status updated by recruiter"
                });
            }
        }
        let reminderWarning = "";
        let calendarEventCreated = false;

        if (interviewDate !== undefined) application.interviewDate = interviewDate;
        if (interviewType !== undefined) application.interviewType = interviewType;
        if (assessmentLink !== undefined) application.assessmentLink = assessmentLink;
        if (assessmentDueDate !== undefined) application.assessmentDueDate = assessmentDueDate;
        if (assessmentTitle !== undefined) application.assessmentTitle = assessmentTitle;

        if (interviewDate && interviewType) {
            try {
                const interviewStart = new Date(interviewDate);
                const calendarResult = await createInterviewEventWithFallback({
                    candidateUser,
                    recruiterUser,
                    event: buildInterviewEvent({
                        application,
                        candidateUser,
                        recruiterUser,
                        startDate: interviewStart,
                        interviewType
                    })
                });

                const calendarEvent = calendarResult.event;
                if (calendarResult.warning) {
                    reminderWarning = calendarResult.warning;
                }

                const generatedMeetLink =
                    calendarEvent.hangoutLink ||
                    calendarEvent.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri ||
                    "";

                if (interviewType === "video" && !generatedMeetLink) {
                    throw new Error("Google Calendar event was created, but Google Meet link was not generated.");
                }

                application.interviewLink = generatedMeetLink || interviewLink || "";
                calendarEventCreated = true;
            } catch (error) {
                console.error("Interview calendar event error:", error);
                application.interviewLink = interviewLink || application.interviewLink;
                reminderWarning = error.message || "Interview reminder could not be added to the candidate's Google Calendar.";
            }
        } else if (interviewLink !== undefined) {
            application.interviewLink = interviewLink;
        }

        if (assessmentDueDate && (assessmentTitle !== undefined || assessmentLink !== undefined)) {
            const assessmentEvent = buildAssessmentEvent({
                application,
                candidateUser,
                recruiterUser,
                dueDate: assessmentDueDate,
                assessmentTitle: assessmentTitle || application.assessmentTitle,
                assessmentLink: assessmentLink || application.assessmentLink
            });
            // Try candidate's calendar first, fallback to recruiter's
            let created = false;
            try {
                await createCalendarEventForUser(candidateUser, assessmentEvent);
                created = true;
                calendarEventCreated = true;
            } catch (candidateErr) {
                console.error("Assessment calendar (candidate):", candidateErr.message);
                reminderWarning = reminderWarning || candidateErr.message;
            }
            if (!created) {
                try {
                    await createCalendarEventForUser(recruiterUser, assessmentEvent);
                    calendarEventCreated = true;
                    if (reminderWarning) {
                        reminderWarning += " Event added to recruiter's calendar instead.";
                    }
                } catch (recruiterErr) {
                    console.error("Assessment calendar (recruiter fallback):", recruiterErr.message);
                    reminderWarning = reminderWarning || recruiterErr.message || "OA reminder could not be added to Google Calendar.";
                }
            }
        }

        await application.save();

        res.json({ success: true, application, reminderWarning, calendarEventCreated });
    } catch (error) {
        console.error("Update Status Error:", error);
        res.status(500).json({ success: false });
    }
};

/**
 * RECRUITER — Bulk update application status for multiple candidates
 */
const bulkUpdateApplicationStatus = async (req, res) => {
    try {
        const { ids, status } = req.body || {};
        if (!Array.isArray(ids) || ids.length === 0 || !status) {
            return res.status(400).json({ success: false, message: "ids[] and status are required" });
        }

        const recruiterUser = await User.findOne({ id: req.user.id });
        if (!recruiterUser) {
            return res.status(404).json({ success: false, message: "Recruiter not found" });
        }

        const applications = await Application.find({
            _id: { $in: ids.filter((x) => mongoose.Types.ObjectId.isValid(x)) },
            recruiterId: recruiterUser._id
        });

        let updatedCount = 0;
        for (const application of applications) {
            const previousStatus = application.status || "";
            application.status = status;
            if (status !== previousStatus) {
                pushStatusHistory(application, {
                    from: previousStatus,
                    to: status,
                    changedBy: req.user.id,
                    note: "Status updated in bulk by recruiter"
                });
            }
            await application.save();
            updatedCount += 1;
        }

        return res.json({
            success: true,
            updatedCount,
            requestedCount: ids.length
        });
    } catch (error) {
        console.error("Bulk Update Status Error:", error);
        return res.status(500).json({ success: false, message: "Bulk status update failed" });
    }
};


module.exports = {
    applyToJob,
    getCandidateApplications,
    getRecruiterApplications,
    getApplicationsForJob,
    updateApplicationStatus,
    bulkUpdateApplicationStatus
};
