import { NextRequest } from 'next/server';
import { handleRouteError, successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth, getUserId } from '@/lib/auth';
import { parseFormData, validateFile } from '@/lib/file-upload';

// Polyfill DOMMatrix for pdf-parse in serverless environment
if (typeof (globalThis as any).DOMMatrix === "undefined") {
  class DOMMatrix {}
  class DOMMatrixReadOnly {}
  class DOMPoint {}
  class DOMRect {}
  (globalThis as any).DOMMatrix = DOMMatrix;
  (globalThis as any).DOMMatrixReadOnly = DOMMatrixReadOnly;
  (globalThis as any).DOMPoint = DOMPoint;
  (globalThis as any).DOMRect = DOMRect;
}

const Candidate = require('@server/models/Candidate');
const User = require('@server/models/User');

const getCandidateContext = async (decoded: any) => {
  const userId = decoded.id || decoded.userId;
  if (!userId) return { error: { code: 401, message: "Invalid user token" } };

  console.log('[Resume Upload] Looking for user with id:', userId);
  
  let user = await User.findOne({ id: String(userId) });
  if (!user) {
    console.log('[Resume Upload] User not found by id field, trying _id...');
    user = await User.findOne({ _id: String(userId) });
  }
  if (!user && decoded.email) {
    console.log('[Resume Upload] User not found by id/_id, trying email:', decoded.email);
    user = await User.findOne({ email: decoded.email });
  }

  if (!user) {
    console.error('[Resume Upload] User not found with any method');
    return { error: { code: 404, message: "User not found" } };
  }
  
  console.log('[Resume Upload] Found user:', user.email);
  
  if (user.userType && user.userType !== "candidate") {
    return { error: { code: 403, message: "Not a candidate account" } };
  }

  const effectiveUserId = user.id || user._id || userId;
  let candidate = await Candidate.findOne({ userId: String(effectiveUserId) });
  if (!candidate) candidate = await Candidate.findOne({ userId: String(user.id) });

  if (!candidate) {
    candidate = await Candidate.create({
      userId: effectiveUserId,
      name: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      githubUrl: user.githubUrl || "",
      linkedinUrl: user.linkedinUrl || "",
      title: user.title || "",
      location: user.location || "",
      technicalSkills: user.technicalSkills || user.skills || [],
      skills: user.skills || [],
      summary: user.bio || "",
      experience: user.experience || [],
      education: user.education || [],
      projects: user.projects || [],
      extraCurricular: user.extraCurricular || []
    });
  }

  return { user, candidate };
};

const safeSkills = (arr: any[]) => {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((x) => String(x || "").trim()).filter(Boolean))];
};

export async function POST(request: NextRequest) {
  return handleRouteError(async () => {
    console.log('[Resume Upload] Starting upload...');
    
    const decoded = requireAuth(request);
    const userId = getUserId(decoded);

    // Parse multipart form data
    const { files } = await parseFormData(request);
    const file = files['resume'];

    if (!file) {
      console.error('[Resume Upload] No file in request');
      return errorResponse("Resume file is required", 400);
    }

    console.log('[Resume Upload] File size:', file.size, 'bytes');

    // Validate file
    const validation = validateFile(file, {
      maxSize: 5 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf'],
      required: true
    });

    if (!validation.valid) {
      return errorResponse(validation.error!, 400);
    }

    console.log('[Resume Upload] Getting candidate context...');
    const context = await getCandidateContext(decoded);
    
    if (context.error) {
      console.error('[Resume Upload] Context error:', context.error);
      return errorResponse(context.error.message, context.error.code);
    }

    const { user, candidate } = context;
    if (!user || !candidate) {
      return errorResponse("User or candidate not found", 404);
    }

    let structuredData: any = {};

    // Gemini AI extraction
    if (process.env.GEMINI_API_KEY) {
      const modelsToTry = [
        process.env.GEMINI_MODEL,
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash",
        "gemini-1.5-pro"
      ].filter(Boolean);

      const pdfBase64 = file.buffer.toString('base64');
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      const prompt = `Extract profile details from this resume PDF.
Return ONLY a valid zero-shot JSON object matching this exact structure:

{
  "name": "Candidate Full Name",
  "email": "Email Address",
  "phone": "Phone Number",
  "githubUrl": "GitHub Profile URL",
  "linkedinUrl": "LinkedIn Profile URL",
  "technicalSkills": ["Skill 1", "Skill 2"],
  "experience": [{"title": "Role Title", "company": "Company Name", "period": "Duration", "description": "One line summary"}],
  "education": [{"degree": "Degree/Branch", "institution": "College/University", "year": "Year/Period"}],
  "projects": [{"name": "Project Name", "description": "One line description"}],
  "extraCurricular": ["Activity/Achievement 1"],
  "summary": "Professional summary paragraph"
}

Fill all available details. Use empty strings or empty arrays for missing fields. Do not include markdown text.`;

      for (const modelName of modelsToTry) {
        try {
          console.log(`[Resume Upload] Trying Gemini model: ${modelName}...`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          });

          const result = await model.generateContent([
            {
              inlineData: {
                mimeType: file.mimetype,
                data: pdfBase64
              }
            },
            { text: prompt }
          ]);

          const response = await result.response;
          const text = response.text();
          console.log(`[Resume Upload] Gemini (${modelName}) response length:`, text?.length);

          if (text) {
            const jsonText = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              structuredData = JSON.parse(jsonMatch[0]);
              console.log('[Resume Upload] Successfully extracted profile for:', structuredData.name || 'Candidate');
              break;
            }
          }
        } catch (geminiModelErr: any) {
          console.warn(`[Resume Upload] Gemini model ${modelName} failed:`, geminiModelErr.message);
        }
      }
    }

    // Merge skills
    const mergedSkills = safeSkills([
      ...(candidate.skills || []),
      ...(structuredData.skills || []),
      ...(structuredData.technicalSkills || [])
    ]);
    const mergedTechnicalSkills = safeSkills([
      ...(candidate.technicalSkills || []),
      ...(structuredData.technicalSkills || []),
      ...mergedSkills
    ]);

    // Update candidate
    candidate.name = structuredData.name || candidate.name || user.fullName || "";
    candidate.email = user.email || candidate.email || "";
    candidate.phone = structuredData.phone || candidate.phone || user.phone || "";
    candidate.githubUrl = structuredData.githubUrl || candidate.githubUrl || user.githubUrl || "";
    candidate.linkedinUrl = structuredData.linkedinUrl || candidate.linkedinUrl || user.linkedinUrl || "";
    candidate.technicalSkills = mergedTechnicalSkills;
    candidate.skills = mergedSkills;
    candidate.experience = Array.isArray(structuredData.experience) ? structuredData.experience : (candidate.experience || []);
    candidate.education = Array.isArray(structuredData.education) ? structuredData.education : (candidate.education || []);
    candidate.projects = Array.isArray(structuredData.projects) ? structuredData.projects : (candidate.projects || []);
    candidate.extraCurricular = Array.isArray(structuredData.extraCurricular) ? structuredData.extraCurricular : (candidate.extraCurricular || []);
    candidate.summary = structuredData.summary || candidate.summary || "";
    candidate.resumeText = structuredData.summary || "Resume uploaded";
    candidate.resumePath = file.originalname || "";

    try {
      if (typeof candidate.save === "function") {
        await candidate.save();
      } else {
        await Candidate.findByIdAndUpdate(candidate.id || candidate._id, candidate);
      }
    } catch (candSaveErr: any) {
      console.error("Candidate save error:", candSaveErr.message);
    }

    // Update user
    user.fullName = candidate.name || user.fullName;
    user.phone = candidate.phone || user.phone;
    user.githubUrl = candidate.githubUrl || user.githubUrl;
    user.linkedinUrl = candidate.linkedinUrl || user.linkedinUrl;
    user.technicalSkills = candidate.technicalSkills || [];
    user.skills = candidate.skills;
    user.bio = candidate.summary || user.bio;
    user.experience = candidate.experience || [];
    user.education = candidate.education || [];
    user.projects = candidate.projects || [];
    user.extraCurricular = candidate.extraCurricular || [];
    user.resumeUrl = file.originalname || user.resumeUrl;

    try {
      if (typeof user.save === "function") {
        await user.save();
      } else {
        await User.findByIdAndUpdate(user.id || user._id, user);
      }
    } catch (userSaveErr: any) {
      console.warn("User save warning:", userSaveErr.message);
    }

    console.log('[Resume Upload] Success!');
    return successResponse({
      message: "Resume uploaded and profile updated successfully",
      candidate
    });
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
