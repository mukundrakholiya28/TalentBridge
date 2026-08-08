require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const multer = require("multer");
const next = require("next");

const isDev = process.argv.includes("--dev") || process.env.NODE_ENV === "development";
if (isDev) {
    process.env.NODE_ENV = "development";
} else {
    process.env.NODE_ENV = "production";
}
const dev = isDev;
const port = parseInt(process.env.PORT || "5000", 10);
const hostname = "localhost";

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

// Backend Controllers
const { uploadResume } = require("./server/controllers/resumeController");

// Backend Routes
const authRoutes = require("./server/routes/auth");
const jobRoutes = require("./server/routes/jobs");
const applicationRoutes = require("./server/routes/applications");
const messageRoutes = require("./server/routes/messages");
const evaluationRoutes = require("./server/routes/evaluation");
const ragSearchRoutes = require("./server/routes/ragSearch");
const atsRoutes = require("./server/routes/ats");
const resumeRoutes = require("./server/routes/resume");
const offerRoutes = require("./server/routes/offers");
const oaRoutes = require("./server/routes/oa");
const candidateRoutes = require("./server/routes/candidate");
const authMiddleware = require("./server/middleware/authMiddleware");

nextApp.prepare().then(() => {
    const app = express();
    const server = http.createServer(app);
    // Middleware
    app.use(cors());
    app.use(express.json({ limit: "5mb" }));

    // Multer Configuration (PDF Upload)
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

    // Supabase Database Initialization
    const { isConfigured } = require("./server/db/supabaseClient");
    if (isConfigured) {
        console.log("✅ Connected to Supabase Cloud Database");
    } else {
        console.log("⚡ Supabase database active (Set SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY in .env for Supabase Cloud)");
    }

    // Express API Routes
    app.use("/api/auth", authRoutes);
    app.use("/api/jobs", jobRoutes);
    app.use("/api/applications", applicationRoutes);
    app.use("/api/messages", messageRoutes);
    app.use("/api/evaluation", evaluationRoutes);
    app.use("/api/rag", ragSearchRoutes);
    app.use("/api/ats", atsRoutes);
    app.use("/api/resume", resumeRoutes);
    app.use("/api/offers", offerRoutes);
    app.use("/api/oa", oaRoutes);
    app.use("/api/candidate", candidateRoutes);

    // Resume Upload Route
    app.post("/api/upload-resume", authMiddleware, upload.single("resume"), uploadResume);

    // API Error Handler
    app.use("/api", (err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, error: err.message });
        }
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        next();
    });

    // Delegate all non-API requests to Next.js App Router
    app.use((req, res) => {
        return handle(req, res);
    });

    server.listen(port, (err) => {
        if (err) throw err;
        console.log(`🚀 TalentBridge Unified Next.js Application running at http://localhost:${port}`);
    });
});
