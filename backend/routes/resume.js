const express = require("express");
const router = express.Router();
const { uploadResume, getResume, deleteResume } = require("../controllers/resumeController");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload", authMiddleware, upload.single("resume"), uploadResume);
router.get("/", authMiddleware, getResume);
router.delete("/", authMiddleware, deleteResume);

module.exports = router;