import { NextRequest } from 'next/server';
import { handleRouteError, jsonResponse } from '@/lib/api-response';
import { requireAuth, getUserId } from '@/lib/auth';

const Application = require('@server/models/Application');
const User = require('@server/models/User');

export async function GET(request: NextRequest) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request);
    const userId = getUserId(decoded);

    const recruiterUser = await User.findOne({ id: userId });
    if (!recruiterUser) {
      return jsonResponse([]);
    }

    const applications = await Application.find({ recruiterId: recruiterUser._id })
      .populate("candidateId", "fullName email phone skills")
      .populate("jobId", "title company")
      .sort({ createdAt: -1 });

    const mapped = applications.map((app: any) => ({
      statusHistory: Array.isArray(app.statusHistory) ? app.statusHistory : [],
      auditLog: (Array.isArray(app.statusHistory) ? app.statusHistory : []).map((h: any) => ({
        status: h?.to || app.status || "Pending",
        timestamp: h?.changedAt || app.createdAt
      })),
      id: app._id.toString(),
      _id: app._id,
      jobId: app.jobId?._id?.toString() || "",
      candidateId: app.candidateId?._id?.toString() || "",
      status: app.status || "Pending",
      appliedAt: app.createdAt,
      createdAt: app.createdAt,
      coverLetter: app.coverLetter || "",
      candidateName: app.candidateId?.fullName || "Unknown Candidate",
      position: app.jobId?.title || "Unknown Job",
      appliedDate: new Date(app.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      jobTitle: app.jobId?.title || "Unknown Job",
      candidate: {
        fullName: app.candidateId?.fullName || "Unknown Candidate",
        email: app.candidateId?.email || "",
        phone: app.candidateId?.phone || "",
        profile: {
          skills: app.candidateId?.skills || [],
        }
      },
      interviewLink: app.interviewLink || "",
      interviewDate: app.interviewDate || null,
      interviewType: app.interviewType || "video",
      assessmentLink: app.assessmentLink || "",
      assessmentDueDate: app.assessmentDueDate || null,
      assessmentTitle: app.assessmentTitle || ""
    }));

    return jsonResponse(mapped);
  });
}

export const dynamic = 'force-dynamic';
