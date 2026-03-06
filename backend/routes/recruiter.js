const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getProfile, updateProfile } = require('../controllers/recruiterController');

// GET /api/recruiter/profile
router.get('/profile', authMiddleware, getProfile);

// PUT /api/recruiter/profile
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;
