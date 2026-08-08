require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");

// Controllers
const { uploadResume } = require("./controllers/resumeController");

// Routes
const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobs");
const applicationRoutes = require("./routes/applications");
const messageRoutes = require("./routes/messages");
const evaluationRoutes = require("./routes/evaluation");
const ragSearchRoutes = require("./routes/ragSearch");
const atsRoutes = require("./routes/ats");
const resumeRoutes = require("./routes/resume");
const offerRoutes = require("./routes/offers");
const oaRoutes = require("./routes/oa");
const candidateRoutes = require("./routes/candidate");
const recruiterRoutes = require("./routes/recruiter");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});
const port = process.env.PORT || 5000;

// Make io accessible to controllers via req.app
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
    socket.on('join', (userId) => {
        if (userId) socket.join(userId);
    });
    socket.on('disconnect', () => {});
});

/**
 * Middleware
 */
app.use(cors());
app.use(express.json({ limit: '5mb' }));

/**
 * Multer Configuration (PDF Upload)
 */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed"));
        }
    }
});

/**
 * Supabase Connection
 */
const { getClient, isConfigured } = require('./db/supabaseClient');

if (isConfigured) {
    console.log("✅ Connected to Supabase Database");
} else {
    console.warn("⚠️  Supabase not configured - using in-memory database for development");
    console.warn("⚠️  Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables");
}

/**
 * API Routes
 */
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/messages", messageRoutes);

/**
 * AI Routes
 */
app.use("/api/evaluation", evaluationRoutes);
app.use("/api/rag", ragSearchRoutes);
app.use("/api/ats", atsRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/oa", oaRoutes);
app.use("/api/candidate", candidateRoutes);
app.use("/api/recruiter", recruiterRoutes);

/**
 * Resume Upload Route
 */
const authMiddleware = require("./middleware/authMiddleware");
app.post("/api/upload-resume", authMiddleware, upload.single("resume"), uploadResume);

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    if (err) {
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }

    next();
});

/**
 * Health Check Route
 */
app.get("/", (req, res) => {
    res.send("TalentBridge API running with Supabase");
});

/**
 * Start Server
 */
server.listen(port, () => {
    console.log(`🚀 TalentBridge Backend running at http://localhost:${port}`);
});

