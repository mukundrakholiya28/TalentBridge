const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// Send a new message
const sendMessage = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { receiverId, applicationId, content, type } = req.body;

        if (!receiverId || !content) {
            return res.status(400).json({ success: false, error: 'receiverId and content are required' });
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            applicationId: applicationId || "",
            content,
            type: type || 'text'
        });

        await newMessage.save();

        // Emit real-time event to receiver
        const io = req.app.get('io');
        if (io) {
            io.to(receiverId).emit('new-message', {
                id: newMessage._id,
                senderId,
                receiverId,
                content,
                type: type || 'text',
                timestamp: newMessage.createdAt || new Date().toISOString(),
                read: false
            });
        }

        res.status(201).json({ success: true, message: newMessage });
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ success: false, error: 'Server error sending message' });
    }
};

// Fetch conversation history for a specific application
const getConversation = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const userId = req.user.id;

        const messages = await Message.find({
            applicationId,
            $or: [{ senderId: userId }, { receiverId: userId }]
        }).sort({ timestamp: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.error('Fetch Conversation Error:', error);
        res.status(500).json({ error: 'Server error fetching conversation' });
    }
};

// Fetch all conversations for the current user
const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find all messages where user is sender or receiver
        const allMessages = await Message.find({
            $or: [{ senderId: userId }, { receiverId: userId }]
        }).sort({ createdAt: -1 });

        const conversationsMap = new Map();

        for (const msg of allMessages) {
            const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;

            if (!conversationsMap.has(partnerId)) {
                // Look up partner user by UUID `id` or by MongoDB _id
                const queryPartner = mongoose.Types.ObjectId.isValid(partnerId)
                    ? { $or: [{ id: partnerId }, { _id: partnerId }] }
                    : { id: partnerId };
                const partner = await User.findOne(queryPartner);

                if (partner) {
                    conversationsMap.set(partnerId, {
                        candidateId: partner.id || partner._id.toString(),
                        candidateName: partner.fullName || partner.name || "User",
                        candidateEmail: partner.email || "",
                        lastMessage: msg.content,
                        lastMessageTime: (msg.createdAt || msg.timestamp || new Date()).toISOString(),
                        unreadCount: msg.receiverId === userId && !msg.isRead ? 1 : 0
                    });
                }
            } else if (msg.receiverId === userId && !msg.isRead) {
                const conv = conversationsMap.get(partnerId);
                conv.unreadCount += 1;
            }
        }

        res.status(200).json({ success: true, conversations: Array.from(conversationsMap.values()) });

    } catch (error) {
        console.error('Fetch Conversations Error:', error);
        res.status(500).json({ success: false, error: 'Server error fetching conversations' });
    }
};

// Fetch all messages between the current user and a specific partner
const getMessages = async (req, res) => {
    try {
        const { candidateId } = req.params;
        const userId = req.user.id;

        const messages = await Message.find({
            $or: [
                { senderId: userId, receiverId: candidateId },
                { senderId: candidateId, receiverId: userId }
            ]
        }).sort({ createdAt: 1 });

        const formattedMessages = messages.map(msg => ({
            id: msg._id.toString(),
            senderId: msg.senderId,
            senderName: msg.senderId === userId ? "You" : "User",
            receiverId: msg.receiverId,
            content: msg.content,
            type: msg.type || 'text',
            timestamp: (msg.createdAt || msg.timestamp || new Date()).toISOString(),
            read: msg.isRead || false
        }));

        res.status(200).json({ success: true, messages: formattedMessages });
    } catch (error) {
        console.error('Fetch Messages Error:', error);
        res.status(500).json({ success: false, error: 'Server error fetching messages' });
    }
};

// Mark a message as read
const markMessageRead = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        const message = await Message.findOneAndUpdate(
            { _id: messageId, receiverId: userId },
            { isRead: true },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({ error: 'Message not found or unauthorized' });
        }

        res.status(200).json({ success: true, message });
    } catch (error) {
        console.error('Mark Message Read Error:', error);
        res.status(500).json({ error: 'Server error updating message status' });
    }
};

module.exports = { sendMessage, getConversation, markMessageRead, getConversations, getMessages };
