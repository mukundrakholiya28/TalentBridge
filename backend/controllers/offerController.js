const Offer = require("../models/Offer");
const Application = require("../models/Application");
const User = require("../models/User");
const Job = require("../models/Job");

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

const escapePdfText = (text = "") =>
    String(text || "")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");

const buildSimplePdf = (lines = []) => {
    const safeLines = lines.map((l) => escapePdfText(l)).slice(0, 45);
    let y = 780;
    const lineOps = safeLines.map((line) => {
        const op = `BT /F1 11 Tf 50 ${y} Td (${line}) Tj ET`;
        y -= 16;
        return op;
    }).join("\n");

    const contentStream = `${lineOps}\n`;
    const contentLength = Buffer.byteLength(contentStream, "utf8");

    const objects = [
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
        "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
        `5 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}endstream\nendobj\n`
    ];

    let body = "";
    const offsets = [0];
    for (const obj of objects) {
        offsets.push(Buffer.byteLength(body, "utf8"));
        body += obj;
    }

    const header = "%PDF-1.4\n";
    const xrefStart = Buffer.byteLength(header + body, "utf8");
    const totalObjects = objects.length + 1;

    let xref = `xref\n0 ${totalObjects}\n`;
    xref += "0000000000 65535 f \n";
    for (let i = 1; i < offsets.length; i++) {
        const absolute = Buffer.byteLength(header, "utf8") + offsets[i];
        xref += `${String(absolute).padStart(10, "0")} 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(header + body + xref + trailer, "utf8");
};


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
        const oldStatus = application.status || "";
        application.status = "Offer Extended";
        pushStatusHistory(application, {
            from: oldStatus,
            to: "Offer Extended",
            changedBy: recruiterId,
            note: "Offer letter sent"
        });
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

        // If accepted/rejected, update application status too and keep audit log.
        if (status === "accepted") {
            const app = await Application.findById(offer.applicationId).populate("jobId");
            if (app) {
                const oldStatus = app.status || "";
                app.status = "Offer Accepted";
                pushStatusHistory(app, {
                    from: oldStatus,
                    to: "Offer Accepted",
                    changedBy: req.user.id,
                    note: "Offer accepted by candidate"
                });
                await app.save();

                // Auto-close job once an offer is accepted.
                if (app.jobId?._id) {
                    await Job.findByIdAndUpdate(app.jobId._id, {
                        isOpen: false,
                        closedAt: new Date()
                    });
                }
            }
        } else if (status === "rejected") {
            const app = await Application.findById(offer.applicationId);
            if (app) {
                const oldStatus = app.status || "";
                app.status = "Offer Declined";
                pushStatusHistory(app, {
                    from: oldStatus,
                    to: "Offer Declined",
                    changedBy: req.user.id,
                    note: "Offer declined by candidate"
                });
                await app.save();
            }
        } else if (status === "negotiating") {
            const app = await Application.findById(offer.applicationId);
            if (app) {
                const oldStatus = app.status || "";
                app.status = "Negotiating";
                pushStatusHistory(app, {
                    from: oldStatus,
                    to: "Negotiating",
                    changedBy: req.user.id,
                    note: "Candidate submitted counter-offer"
                });
                await app.save();
            }
        }

        res.json({ success: true, offer });
    } catch (error) {
        console.error("Respond Offer Error:", error);
        res.status(500).json({ success: false, message: "Failed to respond to offer" });
    }
};

const downloadOfferPdf = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate("candidateId", "fullName email")
            .populate("recruiterId", "fullName email companyName")
            .populate({
                path: "applicationId",
                populate: { path: "jobId", select: "title company" }
            });

        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        const requestUser = await User.findOne({ id: req.user.id });
        if (!requestUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const authorized =
            offer.candidateId?._id?.toString() === requestUser._id.toString() ||
            offer.recruiterId?._id?.toString() === requestUser._id.toString();

        if (!authorized) {
            return res.status(403).json({ success: false, message: "Not authorized to access this offer letter" });
        }

        const generatedOn = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
        const company = offer.recruiterId?.companyName || offer.applicationId?.jobId?.company || "Company";
        const role = offer.position || offer.applicationId?.jobId?.title || "Position";
        const candidateName = offer.candidateId?.fullName || "Candidate";
        const recruiterName = offer.recruiterId?.fullName || "Recruiter";
        const status = String(offer.status || "pending").toUpperCase();

        const lines = [
            "TALENTBRIDGE - OFFER LETTER",
            `Generated On: ${generatedOn}`,
            "",
            `Candidate: ${candidateName}`,
            `Candidate Email: ${offer.candidateId?.email || ""}`,
            `Company: ${company}`,
            `Recruiter: ${recruiterName}`,
            `Recruiter Email: ${offer.recruiterId?.email || ""}`,
            "",
            `Position: ${role}`,
            `Compensation: ${offer.salary || ""}`,
            `Start Date: ${offer.startDate || ""}`,
            `Work Type: ${offer.workType || "Full-time"}`,
            `Work Location: ${offer.workLocation || ""}`,
            `Probation Period: ${offer.probationPeriod || ""}`,
            `Joining Bonus: ${offer.joiningBonus || ""}`,
            "",
            "Benefits:",
            `${offer.benefits || "N/A"}`,
            "",
            "Additional Notes:",
            `${offer.additionalNotes || "N/A"}`,
            "",
            `Offer Status: ${status}`,
            "",
            "This offer letter is generated by TalentBridge and intended for platform use.",
            "Please verify legal/HR clauses before final execution."
        ];

        const pdfBuffer = buildSimplePdf(lines);
        const filename = `offer-letter-${offer._id}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
        return res.status(200).send(pdfBuffer);
    } catch (error) {
        console.error("Download Offer PDF Error:", error);
        return res.status(500).json({ success: false, message: "Failed to generate offer PDF" });
    }
};


module.exports = { sendOffer, getRecruiterOffers, getCandidateOffers, respondToOffer, downloadOfferPdf };
