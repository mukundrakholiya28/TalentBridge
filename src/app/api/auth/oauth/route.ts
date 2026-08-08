import { NextRequest } from 'next/server';
import { handleRouteError, successResponse, errorResponse } from '@/lib/api-response';
import { signToken } from '@/lib/auth';
import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'crypto';

const User = require('@server/models/User');
const Candidate = require('@server/models/Candidate');
const Recruiter = require('@server/models/Recruiter');

const buildBaseUsername = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "user";

const ensureUniqueUsername = async (seed: string) => {
  const base = buildBaseUsername(seed);
  let candidate = base;
  let counter = 1;

  while (await User.findOne({ username: candidate })) {
    counter += 1;
    candidate = `${base}${counter}`;
  }

  return candidate;
};

export async function POST(request: NextRequest) {
  return handleRouteError(async () => {
    const body = await request.json();
    const { code, redirectUri, userType = 'candidate', intent = 'signin', codeVerifier } = body;

    if (!code || !redirectUri) {
      return errorResponse('Missing code or redirectUri', 400);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return errorResponse('Google OAuth credentials are not configured', 400);
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

      const r: any = await Promise.race([getTokenPromise, timeoutPromise]);
      tokens = r && r.tokens ? r.tokens : r;
    } catch (e: any) {
      console.error("Google token exchange error:", e?.message || e);
      return errorResponse(`Google OAuth failed: ${e?.message || 'Invalid or expired authorization code'}`, 400);
    }

    if (!tokens || !tokens.id_token) {
      return errorResponse('Failed to retrieve tokens from Google', 400);
    }

    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload) {
      return errorResponse('Invalid Google token', 400);
    }

    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    if (!tokens.access_token) {
      return errorResponse('Failed to retrieve access token from Google', 400);
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Auto-signup if account does not exist
      const username = await ensureUniqueUsername(email?.split("@")[0] || name || '');
      user = new User({
        id: randomUUID(),
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
      if (tokens.refresh_token) {
        user.google.refreshToken = tokens.refresh_token;
      }
      user.google.scope = tokens.scope || user.google.scope;
      if (tokens.expiry_date) {
        user.google.tokenExpiry = new Date(tokens.expiry_date);
      }
      await user.save();
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.userType });
    
    const response: any = { user, token };
    if (!user.google?.refreshToken) {
      response.warning = 'Google Calendar integration may be limited. Please reconnect your Google account if you need calendar features.';
    }
    
    return successResponse(response);
  });
}

export const dynamic = 'force-dynamic';
