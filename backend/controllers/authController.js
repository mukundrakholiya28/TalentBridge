const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_talentbridge_key';

const register = async (req, res) => {
    try {
        const { email, password, fullName, userType, ...otherDetails } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            id: uuidv4(), // Standard UID for references
            email,
            password: hashedPassword,
            fullName,
            userType,
            ...otherDetails
        });

        await newUser.save();

        const token = jwt.sign({ id: newUser.id, userType: newUser.userType }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            user: {
                id: newUser.id,
                email: newUser.email,
                fullName: newUser.fullName,
                userType: newUser.userType
            },
            token
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, userType: user.userType }, JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                userType: user.userType,
                avatarUrl: user.avatarUrl
            },
            token
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

const getSession = async (req, res) => {
    // Basic session validation endpoint expected by the frontend
    try {
        const user = await User.findOne({ id: req.user.id }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Server error retrieving session' });
    }
}

module.exports = { register, login, getSession };
