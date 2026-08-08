import { NextRequest } from 'next/server';
import { handleRouteError, successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

const User = require('../../../../../server/models/User');
const Candidate = require('../../../../../server/models/Candidate');
const Recruiter = require('../../../../../server/models/Recruiter');

export async function GET(request: NextRequest) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request);

    const user = await User.findOne({ id: decoded.userId }).select("-password");

    if (!user) {
      return errorResponse("User not found", 404);
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

    return successResponse({ user, profile });
  });
}

export const dynamic = 'force-dynamic';
