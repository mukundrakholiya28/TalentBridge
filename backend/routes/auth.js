const express = require('express');
const router = express.Router();
const { register, login, getSession } = require('../controllers/authController');

// Middleware to verify JWT token
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/session', authMiddleware, getSession);

module.exports = router;
