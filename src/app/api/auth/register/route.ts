import { NextRequest } from 'next/server';
import { handleRouteError, successResponse, errorResponse } from '@/lib/api-response';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Import models
const User = require('../../../../../server/models/User');
const Candidate = require('../../../../../server/models/Candidate');
const Recruiter = require('../../../../../server/models/Recruiter');

const buildBaseUsername = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "user";

export async function POST(request: NextRequest) {
  return handleRouteError(async () => {
    const body = await request.json();
    const {
      email,
      username,
      password,
      fullName,
      phone,
      companyName,
      companyDescription,
      userType
    } = body;

    const normalizedUsername = username ? buildBaseUsername(username) : undefined;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse("Email already in use", 400);
    }

    if (normalizedUsername) {
      const existingUsername = await User.findOne({ username: normalizedUsername });
      if (existingUsername) {
        return errorResponse("Username already in use", 400);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      id: randomUUID(),
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
      const cand = new Candidate({ userId: user.id, name: fullName, email, phone });
      await cand.save();
    } else if (userType === 'recruiter') {
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

    const token = signToken({ userId: user.id, email: user.email, role: user.userType });

    return successResponse({ user, token });
  });
}

export const dynamic = 'force-dynamic';
