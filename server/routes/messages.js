const express = require('express');
const router = express.Router();
const { sendMessage, getConversation, markMessageRead, getConversations, getMessages } = require('../controllers/messageController');

// Middleware to verify JWT token
const authMiddleware = require('../middleware/authMiddleware');

// Message routes
router.post('/', authMiddleware, sendMessage);
router.get('/conversations', authMiddleware, getConversations);
router.get('/:candidateId', authMiddleware, getMessages);
router.get('/conversation/:applicationId', authMiddleware, getConversation);
router.put('/:messageId/read', authMiddleware, markMessageRead);

module.exports = router;
