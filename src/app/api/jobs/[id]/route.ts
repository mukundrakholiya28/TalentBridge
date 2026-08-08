import { NextRequest } from 'next/server';
import { handleRouteError, successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth, verifyToken, getUserId } from '@/lib/auth';

const Job = require('@server/models/Job');

/**
 * GET JOB BY ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRouteError(async () => {
    const { id } = await params;
    
    let job = await Job.findOne({ id }).populate('recruiter', 'avatarUrl name');
    if (!job) {
      try { 
        job = await Job.findById(id).populate('recruiter', 'avatarUrl name'); 
      } catch (_) { }
    }
    
    if (!job) {
      return errorResponse("Job not found", 404);
    }
    
    return successResponse({ job });
  });
}

/**
 * DELETE JOB
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request);
    const recruiterId = getUserId(decoded);
    const { id: jobId } = await params;

    let job = await Job.findOne({ id: jobId });
    if (!job) {
      try { job = await Job.findById(jobId); } catch (_) { }
    }

    if (!job) {
      return errorResponse("Job not found", 404);
    }

    if (job.recruiterId !== recruiterId) {
      return errorResponse("Unauthorized", 403);
    }

    if (job.id) {
      await Job.deleteOne({ id: job.id });
    } else {
      await Job.findByIdAndDelete(job._id);
    }

    return successResponse({ message: "Job deleted successfully" });
  });
}

export const dynamic = 'force-dynamic';
