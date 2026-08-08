import { NextRequest } from 'next/server';
import { handleRouteError, successResponse, errorResponse } from '@/lib/api-response';

const Job = require('../../../../server/models/Job');

/**
 * GET ALL JOBS (public - for candidates)
 */
export async function GET(request: NextRequest) {
  return handleRouteError(async () => {
    const jobs = await Job.find({ isOpen: { $ne: false } })
      .sort({ createdAt: -1 })
      .populate('recruiter', 'avatarUrl name');
    
    return successResponse({ jobs }, 200);
  });
}

export const dynamic = 'force-dynamic';
