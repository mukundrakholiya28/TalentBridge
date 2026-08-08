import { NextRequest } from 'next/server';
import { handleRouteError, successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth, getUserId } from '@/lib/auth';
import { parseFormData } from '@/lib/file-upload';

const Application = require('@server/models/Application');
const Job = require('@server/models/Job');
const User = require('@server/models/User');
const { mongoose } = require('@server/utils/mongooseCompat');

export async function POST(request: NextRequest) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request);
    const candidateId = getUserId(decoded);

    const { fields, files } = await parseFormData(request);
    const { jobId, coverLetter, portfolio, linkedin, availableFrom } = fields;

    if (!jobId) {
      return errorResponse("Job ID required", 400);
    }

    // Find job by custom UUID `id` OR by MongoDB _id
    let job = await Job.findOne({ id: jobId });
    if (!job && mongoose.Types.ObjectId.isValid(jobId)) {
      job = await Job.findById(jobId);
    }

    if (!job) {
      return errorResponse("Job not found", 404);
    }
    
    if (job.isOpen === false) {
      return errorResponse("This job position is closed", 400);
    }

    // Find candidate user by UUID `id`
    const candidateUser = await User.findOne({ id: candidateId });
    if (!candidateUser) {
      return errorResponse("Candidate not found", 404);
    }

    // Find recruiter user by UUID `id` stored on the job
    const recruiterUser = await User.findOne({ id: job.recruiterId });
    if (!recruiterUser) {
      return errorResponse("Recruiter not found", 404);
    }

    // Prevent duplicate applications
    const existingApp = await Application.findOne({
      jobId: job._id,
      candidateId: candidateUser._id
    });
    
    if (existingApp) {
      const status = (existingApp.status || '').toLowerCase();
      if (status === 'rejected' || status === 'offer declined' || status === 'offer-declined') {
        // Previous was rejected — delete it so they can re-apply
        await Application.deleteOne({ _id: existingApp._id });
      } else {
        return errorResponse("You have already applied to this job", 400);
      }
    }

    const resume = files['resume'];

    const application = await Application.create({
      jobId: job._id,
      candidateId: candidateUser._id,
      recruiterId: recruiterUser._id,
      coverLetter: coverLetter || "",
      portfolio: portfolio || "",
      linkedin: linkedin || "",
      availableFrom: availableFrom || null,
      resumeFileName: resume ? resume.originalname : null,
      status: "Pending",
      statusHistory: [{
        from: "",
        to: "Pending",
        changedBy: candidateId,
        note: "Application submitted",
        changedAt: new Date()
      }]
    });

    return successResponse({ application }, 201);
  });
}

export const dynamic = 'force-dynamic';
