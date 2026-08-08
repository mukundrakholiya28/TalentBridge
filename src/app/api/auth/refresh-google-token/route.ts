import { NextRequest } from 'next/server';
import { handleRouteError, successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { OAuth2Client } from 'google-auth-library';

const User = require('@server/models/User');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request);

    const user = await User.findOne({ id: decoded.userId });
    if (!user || !user.google || !user.google.refreshToken) {
      return errorResponse('No refresh token available for user', 400);
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return errorResponse('Google OAuth not configured on server', 500);
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    client.setCredentials({ refresh_token: user.google.refreshToken });
    const r = await client.refreshAccessToken();
    const newTokens: any = r && (r as any).credentials ? (r as any).credentials : r;

    user.google = user.google || {};
    if (newTokens.access_token) user.google.accessToken = newTokens.access_token;
    if (newTokens.refresh_token) user.google.refreshToken = newTokens.refresh_token;
    if (newTokens.scope) user.google.scope = newTokens.scope;
    if (newTokens.expiry_date) user.google.tokenExpiry = new Date(newTokens.expiry_date);
    await user.save();

    return successResponse({ tokens: newTokens });
  });
}

export const dynamic = 'force-dynamic';
