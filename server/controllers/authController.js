const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID: uuidv4 } = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret_talentbridge_key";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const buildBaseUsername = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "user";

const ensureUniqueUsername = async (seed) => {
  const base = buildBaseUsername(seed);
  let candidate = base;
  let counter = 1;

  while (await User.findOne({ username: candidate })) {
    counter += 1;
    candidate = `${base}${counter}`;
  }

  return candidate;
};

/**
 * Exchange authorization code from frontend for tokens and create/sign-in user
 * Expects: { code, redirectUri, userType?: 'candidate'|'recruiter', intent?: 'signin'|'signup' }
 */
const oauthExchange = async (req, res) => {
  try {
    const { code, redirectUri, userType = 'candidate', intent = 'signin', codeVerifier } = req.body;

    if (!code || !redirectUri) return res.status(400).json({ error: 'Missing code or redirectUri' });

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are not configured on server' });
    }

    const client = new OAuth2Client(clientId, clientSecret, redirectUri);
    let tokens;
    try {
      const getTokenPromise = codeVerifier
        ? client.getToken({ code, codeVerifier })
        : client.getToken(code);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Google token exchange timed out')), 8000)
      );

      const r = await Promise.race([getTokenPromise, timeoutPromise]);
      tokens = r && r.tokens ? r.tokens : r;
    } catch (e) {
      console.error("Google token exchange error:", e?.message || e);
      return res.status(400).json({ error: `Google OAuth failed: ${e?.message || 'Invalid or expired authorization code'}` });
    }

    if (!tokens || !tokens.id_token) {
      return res.status(400).json({ error: 'Failed to retrieve tokens from Google' });
    }

    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    // Validate that we received required tokens
    if (!tokens.access_token) {
      return res.status(400).json({ error: 'Failed to retrieve access token from Google' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Auto-signup if account does not exist
      const username = await ensureUniqueUsername(email.split("@")[0] || name);
      user = new User({
        id: uuidv4(),
        email,
        username,
        fullName: name,
        avatarUrl: picture,
        userType: userType === 'recruiter' ? 'recruiter' : 'candidate',
        google: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          scope: tokens.scope,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
        }
      });
      await user.save();

      if (user.userType === 'candidate') {
        const cand = new Candidate({ userId: user.id, name: name || '', email });
        await cand.save();
      } else {
        const rec = new Recruiter({ userId: user.id, name: name || '', email });
        await rec.save();
      }
    } else {
      // Update Google tokens
      user.google = user.google || {};
      user.google.accessToken = tokens.access_token;
      // Only update refresh token if a new one is provided (Google doesn't always return it)
      if (tokens.refresh_token) {
        user.google.refreshToken = tokens.refresh_token;
      }
      user.google.scope = tokens.scope || user.google.scope;
      if (tokens.expiry_date) {
        user.google.tokenExpiry = new Date(tokens.expiry_date);
      }
      await user.save();
    }

    const token = jwt.sign({ id: user.id, userType: user.userType }, JWT_SECRET, { expiresIn: '7d' });
    
    // Prepare response with warning if refresh token is missing
    const response = { user, token };
    if (!user.google?.refreshToken) {
      response.warning = 'Google Calendar integration may be limited. Please reconnect your Google account if you need calendar features.';
    }
    
    res.json(response);
  } catch (err) {
    console.error('OAuth exchange error:', err);
    const message =
      err?.response?.data?.error_description ||
      err?.response?.data?.error ||
      err?.message ||
      'OAuth exchange failed';
    res.status(500).json({ error: message });
  }
};



/*
EMAIL REGISTER
*/
const register = async (req, res) => {
  try {

    const {
      email,
      username,
      password,
      fullName,
      phone,
      companyName,
      companyDescription,
      userType
    } = req.body;

    const normalizedUsername = username ? buildBaseUsername(username) : undefined;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        error: "Email already in use"
      });
    }

    if (normalizedUsername) {
      const existingUsername = await User.findOne({ username: normalizedUsername });
      if (existingUsername) {
        return res.status(400).json({
          error: "Username already in use"
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      id: uuidv4(),
      email,
      username: normalizedUsername,
      password: hashedPassword,
      fullName,
      userType,
      phone,
      companyName,
      companyDescription
    });

    await user.save();

    // Create linked profile document
    if (userType === 'candidate') {
      const Candidate = require('../models/Candidate');
      const cand = new Candidate({ userId: user.id, name: fullName, email, phone });
      await cand.save();
    } else if (userType === 'recruiter') {
      const Recruiter = require('../models/Recruiter');
      const rec = new Recruiter({
        userId: user.id,
        name: fullName,
        email,
        phone,
        companyName,
        companyDescription
      });
      await rec.save();
    }

    const token = jwt.sign(
      { id: user.id, userType: user.userType },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      user,
      token
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Registration failed"
    });

  }
};



/*
EMAIL LOGIN
*/
const login = async (req, res) => {

  try {

    const { email, identifier, password } = req.body;
    const loginIdentifier = String(identifier || email || "").trim().toLowerCase();

    // Try email first, then username
    let user = await User.findOne({ email: loginIdentifier });
    if (!user) {
      user = await User.findOne({ username: loginIdentifier });
    }

    if (!user) {
      return res.status(400).json({
        error: "Invalid credentials"
      });
    }

    // If frontend provided a desired userType for the sign-in page, enforce it
    if (req.body.userType && user.userType !== req.body.userType) {
      return res.status(403).json({ error: `Account is registered as ${user.userType}. Please use the correct sign-in page.` });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({
        error: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { id: user.id, userType: user.userType },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      user,
      token
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Login failed"
    });

  }

};



/*
GOOGLE AUTH
*/
const Recruiter = require("../models/Recruiter");
const Candidate = require("../models/Candidate");

/**
 * GOOGLE AUTH
 * Expects: { credential, userType?: 'candidate'|'recruiter', intent?: 'signin'|'signup' }
 */
const googleAuth = async (req, res) => {
  try {
    const { credential, userType = "candidate", intent = "signin" } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    let user = await User.findOne({ email });

    if (!user) {
      // Auto-create user if account does not exist
      const username = await ensureUniqueUsername(email.split("@")[0] || name);

      user = new User({
        id: uuidv4(),
        email,
        username,
        fullName: name,
        avatarUrl: picture,
        userType: userType === "recruiter" ? "recruiter" : "candidate"
      });

      await user.save();

      if (user.userType === "candidate") {
        const cand = new Candidate({
          userId: user.id,
          name: name || "",
          email,
        });
        await cand.save();
      } else {
        const rec = new Recruiter({
          userId: user.id,
          name: name || "",
          email,
        });
        await rec.save();
      }
    }

    const token = jwt.sign(
      { id: user.id, userType: user.userType },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ user, token });

  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).json({ error: "Google authentication failed" });
  }
};



/*
SESSION
*/
const getSession = async (req, res) => {

  try {

    const user = await User.findOne({ id: req.user.id });
    // Strip password from response (Supabase doesn't support .select('-field'))
    if (user && user.password) {
      delete user.password;
    }

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    // Attach linked profile (candidate or recruiter) if present
    let profile = null;
    try {
      if (user.userType === 'candidate') {
        profile = await Candidate.findOne({ userId: user.id });
      } else if (user.userType === 'recruiter') {
        profile = await Recruiter.findOne({ userId: user.id });
      }
    } catch (e) {
      profile = null;
    }

    res.json({ user, profile });

  } catch (error) {

    res.status(500).json({
      error: "Session error"
    });

  }
};

/** Refresh Google access token using stored refresh token for authenticated user */
const refreshGoogleToken = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user || !user.google || !user.google.refreshToken) {
      return res.status(400).json({ error: 'No refresh token available for user' });
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Google OAuth not configured on server' });
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    const r = await client.refreshToken(user.google.refreshToken);
    const newTokens = r && r.tokens ? r.tokens : r;

    user.google = user.google || {};
    if (newTokens.access_token) user.google.accessToken = newTokens.access_token;
    if (newTokens.refresh_token) user.google.refreshToken = newTokens.refresh_token;
    if (newTokens.scope) user.google.scope = newTokens.scope;
    if (newTokens.expiry_date) user.google.tokenExpiry = new Date(newTokens.expiry_date);
    await user.save();

    return res.json({ success: true, tokens: newTokens });
  } catch (err) {
    console.error('Refresh token error:', err);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
};



module.exports = {
  register,
  login,
  googleAuth,
  getSession,
  oauthExchange,
  refreshGoogleToken
};
