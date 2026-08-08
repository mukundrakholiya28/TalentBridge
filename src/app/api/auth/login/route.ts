import { NextRequest } from 'next/server';
import { handleRouteError, successResponse, errorResponse } from '@/lib/api-response';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const User = require('@server/models/User');

export async function POST(request: NextRequest) {
  return handleRouteError(async () => {
    const body = await request.json();
    const { email, identifier, password, userType } = body;
    const loginIdentifier = String(identifier || email || "").trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: loginIdentifier }, { username: loginIdentifier }]
    });

    if (!user) {
      return errorResponse("Invalid credentials", 400);
    }

    // If frontend provided a desired userType for the sign-in page, enforce it
    if (userType && user.userType !== userType) {
      return errorResponse(`Account is registered as ${user.userType}. Please use the correct sign-in page.`, 403);
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return errorResponse("Invalid credentials", 400);
    }

    const token = signToken({ id: user.id, userType: user.userType });

    return successResponse({ user, token });
  });
}

export const dynamic = 'force-dynamic';
