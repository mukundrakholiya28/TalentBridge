const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    applicationId: { type: String, default: "" },
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'voice', 'video'], default: 'text' },
    isRead: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
