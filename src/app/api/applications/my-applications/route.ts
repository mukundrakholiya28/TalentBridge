import { NextRequest } from 'next/server';
import { handleRouteError, jsonResponse } from '@/lib/api-response';
import { requireAuth, getUserId } from '@/lib/auth';

const Application = require('@server/models/Application');
const User = require('@server/models/User');

export async function GET(request: NextRequest) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request);
    const userId = getUserId(decoded);

    const candidateUser = await User.findOne({ id: userId });
    if (!candidateUser) {
      return jsonResponse([], 404);
    }

    const applications = await Application.find({ candidateId: candidateUser._id })
      .populate("jobId", "title company location type id")
      .populate("recruiterId", "fullName companyName id")
      .sort({ createdAt: -1 });

    const mapped = applications.map((app: any) => ({
      statusHistory: Array.isArray(app.statusHistory) ? app.statusHistory : [],
      auditLog: (Array.isArray(app.statusHistory) ? app.statusHistory : []).map((h: any) => ({
        status: h?.to || app.status || "Pending",
        timestamp: h?.changedAt || app.createdAt
      })),
      _id: app._id,
      id: app._id.toString(),
      jobId: app.jobId?._id?.toString() || app.jobId?.toString() || "",
      jobTitle: app.jobId?.title || "Position",
      company: app.jobId?.company || "Company",
      location: app.jobId?.location || "",
      status: app.status || "Pending",
      coverLetter: app.coverLetter || "",
      createdAt: app.createdAt,
      appliedAt: app.createdAt,
      recruiterId: app.recruiterId?.id || app.recruiterId?._id?.toString() || "",
      recruiterName: app.recruiterId?.fullName || "",
      interviewLink: app.interviewLink || "",
      interviewDate: app.interviewDate || null,
      interviewType: app.interviewType || "video",
      assessmentLink: app.assessmentLink || "",
      assessmentDueDate: app.assessmentDueDate || null,
      assessmentTitle: app.assessmentTitle || "",
    }));

    return jsonResponse(mapped);
  });
}

export const dynamic = 'force-dynamic';
