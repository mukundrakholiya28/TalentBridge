const Assessment = require("../models/Assessment");
const AssessmentAttempt = require("../models/AssessmentAttempt");
const Application = require("../models/Application");
const User = require("../models/User");
const { evaluateTestCases } = require("../utils/codeRunner");
const {
    createCalendarEventForUser,
    buildAssessmentEvent
} = require("../utils/googleCalendar");

const normalizeQuestions = (questions) => {
    if (!Array.isArray(questions)) return [];
    return questions
        .map((q) => ({
            prompt: String(q?.prompt || "").trim(),
            options: Array.isArray(q?.options) ? q.options.map((x) => String(x || "").trim()).filter(Boolean) : [],
            correctAnswer: String(q?.correctAnswer || "").trim(),
            points: Number(q?.points || 1)
        }))
        .filter((q) => q.prompt && q.correctAnswer);
};

const normalizeCodingQuestions = (codingQuestions) => {
    if (!Array.isArray(codingQuestions)) return [];
    return codingQuestions
        .map((cq) => ({
            title: String(cq?.title || "").trim(),
            problemStatement: String(cq?.problemStatement || "").trim(),
            language: String(cq?.language || "javascript").trim() || "javascript",
            starterCode: String(cq?.starterCode || "").trim(),
            testCases: Array.isArray(cq?.testCases)
                ? cq.testCases
                    .map((tc) => ({
                        input: String(tc?.input || ""),
                        expectedOutput: String(tc?.expectedOutput || "").trim(),
                        isHidden: Boolean(tc?.isHidden)
                    }))
                    .filter((tc) => tc.expectedOutput)
                : [],
            points: Number(cq?.points || 10)
        }))
        .filter((cq) => cq.title && cq.problemStatement && cq.testCases.length > 0);
};

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

const getAttemptTiming = (assessment, attempt) => {
    const durationMinutes = Number(assessment?.durationMinutes || 0);
    const startedAt = attempt?.createdAt ? new Date(attempt.createdAt) : new Date();
    const deadlineAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
    const remainingSeconds = Math.max(0, Math.floor((deadlineAt.getTime() - Date.now()) / 1000));
    const timeExpired = remainingSeconds <= 0;
    return { startedAt, deadlineAt, remainingSeconds, timeExpired };
};

const createAssessment = async (req, res) => {
    try {
        const recruiterUser = await User.findOne({ id: req.user.id });
        if (!recruiterUser || recruiterUser.userType !== "recruiter") {
            return res.status(403).json({ success: false, message: "Recruiter access required" });
        }

        const { applicationId, title, instructions, durationMinutes, dueDate, questions, codingQuestions } = req.body;
        if (!applicationId || !title) {
            return res.status(400).json({ success: false, message: "applicationId and title are required" });
        }

        const application = await Application.findById(applicationId).populate("jobId", "title company");
        if (!application) return res.status(404).json({ success: false, message: "Application not found" });
        if (!application.recruiterId.equals(recruiterUser._id)) {
            return res.status(403).json({ success: false, message: "Not authorized for this application" });
        }

        const normalizedQuestions = normalizeQuestions(questions);
        const normalizedCodingQuestions = normalizeCodingQuestions(codingQuestions);
        if (normalizedQuestions.length === 0 && normalizedCodingQuestions.length === 0) {
            return res.status(400).json({ success: false, message: "Add at least one MCQ or one coding question" });
        }

        const totalPoints =
            normalizedQuestions.reduce((sum, q) => sum + (q.points || 0), 0) +
            normalizedCodingQuestions.reduce((sum, cq) => sum + (cq.points || 0), 0);

        const assessment = await Assessment.create({
            recruiterId: recruiterUser._id,
            candidateId: application.candidateId,
            applicationId: application._id,
            title: String(title).trim(),
            instructions: String(instructions || "").trim(),
            durationMinutes: Number(durationMinutes || 60),
            dueDate: dueDate ? new Date(dueDate) : undefined,
            questions: normalizedQuestions,
            codingQuestions: normalizedCodingQuestions,
            totalPoints,
            status: "active"
        });

        const oldStatus = application.status || "";
        application.assessmentTitle = assessment.title;
        application.assessmentDueDate = assessment.dueDate || application.assessmentDueDate;
        application.assessmentLink = `/candidate/assessment/${assessment._id}`;
        application.status = "in-process";
        if (oldStatus !== "in-process") {
            pushStatusHistory(application, {
                from: oldStatus,
                to: "in-process",
                changedBy: req.user.id,
                note: "Integrated OA assigned"
            });
        }
        await application.save();

        // Add assessment reminder to candidate's Google Calendar (with recruiter fallback)
        let calendarWarning = "";
        let calendarEventCreated = false;
        if (assessment.dueDate) {
            const candidateUser = await User.findById(application.candidateId);
            const assessmentEvent = buildAssessmentEvent({
                application,
                candidateUser: candidateUser || {},
                recruiterUser,
                dueDate: assessment.dueDate,
                assessmentTitle: assessment.title,
                assessmentLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}${application.assessmentLink}`
            });

            // Try candidate's calendar first, then recruiter's as fallback
            let created = false;
            if (candidateUser) {
                try {
                    await createCalendarEventForUser(candidateUser, assessmentEvent);
                    created = true;
                    calendarEventCreated = true;
                } catch (candidateErr) {
                    console.error("Candidate calendar event error:", candidateErr.message);
                    calendarWarning = candidateErr.message;
                }
            }
            if (!created) {
                try {
                    await createCalendarEventForUser(recruiterUser, assessmentEvent);
                    calendarEventCreated = true;
                    if (calendarWarning) {
                        calendarWarning += " Event added to recruiter's calendar instead.";
                    }
                } catch (recruiterErr) {
                    console.error("Recruiter calendar fallback error:", recruiterErr.message);
                    calendarWarning = calendarWarning || recruiterErr.message || "Could not add OA reminder to Google Calendar.";
                }
            }
        }

        return res.status(201).json({
            success: true,
            assessment,
            assessmentLink: application.assessmentLink,
            calendarWarning,
            calendarEventCreated
        });
    } catch (error) {
        console.error("Create assessment error:", error);
        return res.status(500).json({ success: false, message: "Failed to create assessment" });
    }
};

const getCandidateAssessments = async (req, res) => {
    try {
        const candidateUser = await User.findOne({ id: req.user.id });
        if (!candidateUser || candidateUser.userType !== "candidate") {
            return res.status(403).json({ success: false, message: "Candidate access required" });
        }

        const assessments = await Assessment.find({ candidateId: candidateUser._id })
            .populate("applicationId", "status")
            .sort({ createdAt: -1 });

        return res.json({ success: true, assessments });
    } catch (error) {
        console.error("Get candidate assessments error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch assessments" });
    }
};

const getAssessmentForCandidate = async (req, res) => {
    try {
        const candidateUser = await User.findOne({ id: req.user.id });
        if (!candidateUser || candidateUser.userType !== "candidate") {
            return res.status(403).json({ success: false, message: "Candidate access required" });
        }

        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found" });
        if (!assessment.candidateId.equals(candidateUser._id)) {
            return res.status(403).json({ success: false, message: "Not authorized for this assessment" });
        }

        let attempt = await AssessmentAttempt.findOne({
            assessmentId: assessment._id,
            candidateId: candidateUser._id
        });

        if (!attempt) {
            attempt = await AssessmentAttempt.create({
                assessmentId: assessment._id,
                applicationId: assessment.applicationId,
                candidateId: candidateUser._id,
                maxScore: assessment.totalPoints
            });
        }

        const redactedQuestions = assessment.questions.map((q) => ({
            prompt: q.prompt,
            options: q.options,
            points: q.points
        }));

        // Redact coding questions: hide hidden test cases' expected output
        const redactedCodingQuestions = (assessment.codingQuestions || []).map((cq) => ({
            title: cq.title,
            problemStatement: cq.problemStatement,
            language: cq.language,
            starterCode: cq.starterCode,
            points: cq.points,
            testCases: cq.testCases.map((tc) => ({
                input: tc.input,
                expectedOutput: tc.isHidden ? "" : tc.expectedOutput,
                isHidden: tc.isHidden
            }))
        }));

        const timing = getAttemptTiming(assessment, attempt);

        return res.json({
            success: true,
            assessment: {
                _id: assessment._id,
                title: assessment.title,
                instructions: assessment.instructions,
                durationMinutes: assessment.durationMinutes,
                dueDate: assessment.dueDate,
                totalPoints: assessment.totalPoints,
                status: assessment.status,
                questions: redactedQuestions,
                codingQuestions: redactedCodingQuestions
            },
            attempt,
            timing
        });
    } catch (error) {
        console.error("Get assessment for candidate error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch assessment" });
    }
};

const submitAssessment = async (req, res) => {
    try {
        const candidateUser = await User.findOne({ id: req.user.id });
        if (!candidateUser || candidateUser.userType !== "candidate") {
            return res.status(403).json({ success: false, message: "Candidate access required" });
        }

        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found" });
        if (!assessment.candidateId.equals(candidateUser._id)) {
            return res.status(403).json({ success: false, message: "Not authorized for this assessment" });
        }

        let existingAttempt = await AssessmentAttempt.findOne({
            assessmentId: assessment._id,
            candidateId: candidateUser._id
        });
        if (!existingAttempt) {
            existingAttempt = await AssessmentAttempt.create({
                assessmentId: assessment._id,
                applicationId: assessment.applicationId,
                candidateId: candidateUser._id,
                maxScore: assessment.totalPoints
            });
        }
        const timing = getAttemptTiming(assessment, existingAttempt);

        const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
        const codingAnswersRaw = Array.isArray(req.body?.codingAnswers) ? req.body.codingAnswers : [];
        const normalizedAnswers = answers.map((a) => ({
            questionIndex: Number(a?.questionIndex),
            answer: String(a?.answer || "").trim()
        })).filter((a) => Number.isInteger(a.questionIndex) && a.questionIndex >= 0);

        // Score MCQs
        let mcqScore = 0;
        for (const ans of normalizedAnswers) {
            const question = assessment.questions[ans.questionIndex];
            if (!question) continue;
            if (String(ans.answer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase()) {
                mcqScore += Number(question.points || 0);
            }
        }

        // Score coding questions by running test cases
        const codingAnswers = [];
        let codingScore = 0;
        for (const ca of codingAnswersRaw) {
            const qIdx = Number(ca?.questionIndex);
            const codingQ = (assessment.codingQuestions || [])[qIdx];
            if (!codingQ) continue;

            const code = String(ca?.code || "").slice(0, 50000);
            const language = codingQ.language;

            let testResults = [];
            let passedAll = false;
            try {
                testResults = await evaluateTestCases(code, language, codingQ.testCases);
                passedAll = testResults.length > 0 && testResults.every((r) => r.passed);
            } catch {
                testResults = codingQ.testCases.map((tc) => ({
                    input: tc.input, expectedOutput: tc.expectedOutput,
                    actualOutput: "Execution Error", passed: false, isHidden: tc.isHidden
                }));
            }

            const qScore = passedAll ? Number(codingQ.points || 0) : 0;
            codingScore += qScore;
            codingAnswers.push({
                questionIndex: qIdx,
                code,
                language,
                testResults,
                passedAll,
                score: qScore
            });
        }

        const score = mcqScore + codingScore;
        const maxScore = assessment.totalPoints || 0;
        const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

        const attempt = await AssessmentAttempt.findOneAndUpdate(
            { assessmentId: assessment._id, candidateId: candidateUser._id },
            {
                $set: {
                    answers: normalizedAnswers,
                    codingAnswers,
                    score,
                    maxScore,
                    percentage,
                    submittedAt: new Date(),
                    status: "submitted"
                }
            },
            { new: true, upsert: true }
        );

        const application = await Application.findById(assessment.applicationId);
        if (application) {
            const oldStatus = application.status || "";
            application.status = "Assessment Completed";
            pushStatusHistory(application, {
                from: oldStatus,
                to: "Assessment Completed",
                changedBy: req.user.id,
                note: `OA submitted with ${percentage.toFixed(1)}%`
            });
            await application.save();
        }

        return res.json({
            success: true,
            score,
            maxScore,
            percentage,
            attempt,
            timedOut: timing.timeExpired
        });
    } catch (error) {
        console.error("Submit assessment error:", error);
        return res.status(500).json({ success: false, message: "Failed to submit assessment" });
    }
};

const logProctorEvent = async (req, res) => {
    try {
        const candidateUser = await User.findOne({ id: req.user.id });
        if (!candidateUser || candidateUser.userType !== "candidate") {
            return res.status(403).json({ success: false, message: "Candidate access required" });
        }

        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found" });
        if (!assessment.candidateId.equals(candidateUser._id)) {
            return res.status(403).json({ success: false, message: "Not authorized for this assessment" });
        }

        const { type = "tab-switch", details = "" } = req.body || {};
        const attempt = await AssessmentAttempt.findOneAndUpdate(
            { assessmentId: assessment._id, candidateId: candidateUser._id },
            {
                $inc: { tabSwitchCount: type === "tab-switch" ? 1 : 0 },
                $push: { proctorEvents: { type, details, timestamp: new Date() } }
            },
            { new: true, upsert: true }
        );

        return res.json({ success: true, attempt });
    } catch (error) {
        console.error("Log proctor event error:", error);
        return res.status(500).json({ success: false, message: "Failed to log proctor event" });
    }
};

const logCodeSnapshot = async (req, res) => {
    try {
        const candidateUser = await User.findOne({ id: req.user.id });
        if (!candidateUser || candidateUser.userType !== "candidate") {
            return res.status(403).json({ success: false, message: "Candidate access required" });
        }

        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found" });
        if (!assessment.candidateId.equals(candidateUser._id)) {
            return res.status(403).json({ success: false, message: "Not authorized for this assessment" });
        }

        const code = String(req.body?.code || "").slice(0, 50000);
        const questionIndex = Number(req.body?.questionIndex || 0);

        const attempt = await AssessmentAttempt.findOneAndUpdate(
            { assessmentId: assessment._id, candidateId: candidateUser._id },
            {
                $push: { codeSnapshots: { code, questionIndex, timestamp: new Date() } }
            },
            { new: true, upsert: true }
        );

        if (attempt?.codeSnapshots?.length > 100) {
            attempt.codeSnapshots = attempt.codeSnapshots.slice(-100);
            await attempt.save();
        }

        return res.json({ success: true });
    } catch (error) {
        console.error("Log code snapshot error:", error);
        return res.status(500).json({ success: false, message: "Failed to log code snapshot" });
    }
};

const getAssessmentResultsForRecruiter = async (req, res) => {
    try {
        const recruiterUser = await User.findOne({ id: req.user.id });
        if (!recruiterUser || recruiterUser.userType !== "recruiter") {
            return res.status(403).json({ success: false, message: "Recruiter access required" });
        }

        const assessment = await Assessment.findById(req.params.id)
            .populate("candidateId", "fullName email")
            .populate("applicationId", "status");
        if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found" });
        if (!assessment.recruiterId.equals(recruiterUser._id)) {
            return res.status(403).json({ success: false, message: "Not authorized for this assessment" });
        }

        const attempts = await AssessmentAttempt.find({ assessmentId: assessment._id })
            .populate("candidateId", "fullName email")
            .sort({ percentage: -1, submittedAt: 1 });

        return res.json({
            success: true,
            assessment,
            scoreboard: attempts.map((a) => ({
                candidateId: a.candidateId?._id || "",
                candidateName: a.candidateId?.fullName || "Candidate",
                candidateEmail: a.candidateId?.email || "",
                score: a.score,
                maxScore: a.maxScore,
                percentage: a.percentage,
                submittedAt: a.submittedAt,
                tabSwitchCount: a.tabSwitchCount,
                status: a.status,
                snapshotCount: Array.isArray(a.codeSnapshots) ? a.codeSnapshots.length : 0
            }))
        });
    } catch (error) {
        console.error("Get assessment results error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch assessment results" });
    }
};

const getAssessmentCodeFeedForRecruiter = async (req, res) => {
    try {
        const recruiterUser = await User.findOne({ id: req.user.id });
        if (!recruiterUser || recruiterUser.userType !== "recruiter") {
            return res.status(403).json({ success: false, message: "Recruiter access required" });
        }

        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found" });
        if (!assessment.recruiterId.equals(recruiterUser._id)) {
            return res.status(403).json({ success: false, message: "Not authorized for this assessment" });
        }

        const candidateId = req.query?.candidateId || assessment.candidateId;
        const attempt = await AssessmentAttempt.findOne({
            assessmentId: assessment._id,
            candidateId
        }).populate("candidateId", "fullName email");

        if (!attempt) return res.json({ success: true, snapshots: [], latestCode: "", candidate: null });

        const snapshots = (attempt.codeSnapshots || []).slice(-40);
        return res.json({
            success: true,
            candidate: {
                name: attempt.candidateId?.fullName || "Candidate",
                email: attempt.candidateId?.email || ""
            },
            codingAnswers: attempt.codingAnswers || [],
            snapshots
        });
    } catch (error) {
        console.error("Get assessment code feed error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch code feed" });
    }
};

const runCodingTests = async (req, res) => {
    try {
        const candidateUser = await User.findOne({ id: req.user.id });
        if (!candidateUser || candidateUser.userType !== "candidate") {
            return res.status(403).json({ success: false, message: "Candidate access required" });
        }

        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found" });
        if (!assessment.candidateId.equals(candidateUser._id)) {
            return res.status(403).json({ success: false, message: "Not authorized for this assessment" });
        }

        const questionIndex = Number(req.body?.questionIndex);
        const code = String(req.body?.code || "").slice(0, 50000);
        const codingQ = (assessment.codingQuestions || [])[questionIndex];
        if (!codingQ) {
            return res.status(400).json({ success: false, message: "Invalid coding question index" });
        }

        // Only run visible test cases for pre-submit testing
        const visibleTestCases = codingQ.testCases.filter((tc) => !tc.isHidden);
        let testResults = [];
        try {
            testResults = await evaluateTestCases(code, codingQ.language, visibleTestCases);
        } catch {
            testResults = visibleTestCases.map((tc) => ({
                input: tc.input, expectedOutput: tc.expectedOutput,
                actualOutput: "Execution Error", passed: false, isHidden: false
            }));
        }

        return res.json({
            success: true,
            testResults,
            passedAll: testResults.length > 0 && testResults.every((r) => r.passed),
            totalVisible: visibleTestCases.length,
            totalHidden: codingQ.testCases.length - visibleTestCases.length
        });
    } catch (error) {
        console.error("Run coding tests error:", error);
        return res.status(500).json({ success: false, message: "Failed to run test cases" });
    }
};

module.exports = {
    createAssessment,
    getCandidateAssessments,
    getAssessmentForCandidate,
    submitAssessment,
    logProctorEvent,
    logCodeSnapshot,
    getAssessmentResultsForRecruiter,
    getAssessmentCodeFeedForRecruiter,
    runCodingTests
};
