import { NextRequest } from 'next/server';
import { handleRouteError, successResponse, errorResponse } from '@/lib/api-response';
import { signToken } from '@/lib/auth';
import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'crypto';

const User = require('@server/models/User');
const Candidate = require('@server/models/Candidate');
const Recruiter = require('@server/models/Recruiter');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
    const { credential, userType = "candidate", intent = "signin" } = body;

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return errorResponse("Invalid Google token", 400);
    }

    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    let user = await User.findOne({ email });

    if (!user) {
      // Auto-create user if account does not exist
      const username = await ensureUniqueUsername(email?.split("@")[0] || name || '');

      user = new User({
        id: randomUUID(),
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

    const token = signToken({ userId: user.id, email: user.email, role: user.userType });

    return successResponse({ user, token });
  });
}

export const dynamic = 'force-dynamic';
