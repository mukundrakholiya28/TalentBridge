import { NextRequest } from 'next/server';
import { handleRouteError, successResponse } from '@/lib/api-response';
import { requireAuth, getUserId } from '@/lib/auth';

const Job = require('@server/models/Job');

/**
 * GET JOBS POSTED BY RECRUITER
 */
export async function GET(request: NextRequest) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request);
    const recruiterId = getUserId(decoded);
    
    const jobs = await Job.find({ recruiterId }).sort({ createdAt: -1 });
    return successResponse({ jobs });
  });
}

export const dynamic = 'force-dynamic';
