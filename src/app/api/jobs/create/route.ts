import { NextRequest } from 'next/server';
import { handleRouteError, successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth, getUserId } from '@/lib/auth';
import { randomUUID } from 'crypto';

const Job = require('@server/models/Job');
const User = require('@server/models/User');
const { createEmbedding } = require('@server/utils/embedding');

export async function POST(request: NextRequest) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request);
    const recruiterId = getUserId(decoded);
    
    const body = await request.json();
    const { title, company, location, type, description, requirements, benefits, salaryMin, salaryMax, skills, experience, education } = body;

    // Generate embedding (graceful fallback if model not ready)
    let embedding = [];
    try {
      const combinedText = `${title} ${description || ""} ${Array.isArray(requirements) ? requirements.join(" ") : (requirements || "")}`;
      embedding = await createEmbedding(combinedText);
    } catch (embError: any) {
      console.warn("Embedding generation skipped:", embError.message);
    }

    // Try to resolve recruiter user to store ObjectId reference
    let recruiterUser = null;
    try {
      recruiterUser = await User.findOne({ id: recruiterId });
    } catch (e) { recruiterUser = null; }

    const newJob = new Job({
      id: randomUUID(),
      recruiterId,
      recruiter: recruiterUser ? recruiterUser._id : undefined,
      title,
      company,
      location,
      type,
      description,
      requirements: Array.isArray(requirements) ? requirements : (requirements || "").split("\n").map((r: string) => r.trim()).filter(Boolean),
      benefits: benefits || [],
      salaryMin: salaryMin || 0,
      salaryMax: salaryMax || 0,
      skills: Array.isArray(skills) ? skills : (skills || "").split(",").map((s: string) => s.trim()).filter(Boolean),
      embedding
    });

    const savedJob = await newJob.save();
    return successResponse({ job: savedJob }, 201);
  });
}

export const dynamic = 'force-dynamic';
