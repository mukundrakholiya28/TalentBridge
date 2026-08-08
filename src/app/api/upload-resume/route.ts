import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Polyfill DOMMatrix for Node environment if needed
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

const Candidate = require('../../../../server/models/Candidate');
const User = require('../../../../server/models/User');

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey123";

const getCandidateContext = async (userId: string, email?: string) => {
  if (!userId && !email) return { error: { code: 401, message: "Invalid user token" } };

  let user: any = null;
  if (userId) {
    user = await User.findOne({ id: String(userId) });
  }
  if (!user && email) {
    user = await User.findOne({ email });
  }

  if (!user) return { error: { code: 404, message: "User not found" } };
  if (user.userType && user.userType !== "candidate") {
    return { error: { code: 403, message: "Not a candidate account" } };
  }

  const effectiveUserId = user.id || user._id || userId;
  let candidate = await Candidate.findOne({ userId: String(effectiveUserId) });

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
  try {
    console.log('[Resume Upload Route] Starting native Next.js upload handling...');

    // 1. Authenticate JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: "Unauthorized: Missing token" }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded: any = null;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ success: false, message: "Unauthorized: Invalid token" }, { status: 401 });
    }

    const userId = decoded.id || decoded._id || decoded.userId;
    const userEmail = decoded.email;

    // 2. Parse Multipart Form Data natively in Next.js
    const formData = await request.formData();
    const file = formData.get('resume') as File | null;

    if (!file) {
      console.error('[Resume Upload Route] No resume file in request');
      return NextResponse.json({ success: false, message: "Resume file is required" }, { status: 400 });
    }

    console.log(`[Resume Upload Route] File: ${file.name} (${file.size} bytes, type: ${file.type})`);

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "File size exceeds 5MB limit" }, { status: 400 });
    }

    // 3. Get candidate context
    const context = await getCandidateContext(userId, userEmail);
    if (context.error) {
      console.error('[Resume Upload Route] Context error:', context.error);
      return NextResponse.json({ success: false, message: context.error.message }, { status: context.error.code });
    }

    const { user, candidate } = context;

    // 4. Extract text/JSON with Gemini zero-shot AI
    let structuredData: any = {};
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfBase64 = buffer.toString('base64');

    if (process.env.GEMINI_API_KEY) {
      const modelsToTry = [
        process.env.GEMINI_MODEL,
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash",
        "gemini-1.5-pro"
      ].filter(Boolean);

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
  "title": "Professional Title / Headline",
  "location": "City, Country",
  "technicalSkills": ["Skill 1", "Skill 2"],
  "experience": [{"title": "Role Title", "company": "Company Name", "period": "Duration", "description": "One line summary"}],
  "education": [{"degree": "Degree/Branch", "institution": "College/University", "year": "Year/Period"}],
  "projects": [{"name": "Project Name", "description": "One line description"}],
  "extraCurricular": ["Activity/Achievement 1"],
  "summary": "Professional summary paragraph"
}

Fill all available details. Use empty strings or empty arrays for missing fields. Do not include markdown formatting outside JSON.`;

      for (const modelName of modelsToTry) {
        try {
          console.log(`[Resume Upload Route] Trying Gemini model: ${modelName}...`);
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
                mimeType: file.type || 'application/pdf',
                data: pdfBase64
              }
            },
            { text: prompt }
          ]);

          const response = await result.response;
          const text = response.text();
          console.log(`[Resume Upload Route] Gemini (${modelName}) output length:`, text?.length);

          if (text) {
            const jsonText = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              structuredData = JSON.parse(jsonMatch[0]);
              console.log('[Resume Upload Route] Successfully parsed resume for:', structuredData.name || 'Candidate');
              break;
            }
          }
        } catch (geminiErr: any) {
          console.warn(`[Resume Upload Route] Model ${modelName} error:`, geminiErr.message);
        }
      }
    }

    // 5. Merge profile data
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

    candidate.name = structuredData.name || candidate.name || user.fullName || "";
    candidate.email = user.email || candidate.email || "";
    candidate.phone = structuredData.phone || candidate.phone || user.phone || "";
    candidate.githubUrl = structuredData.githubUrl || candidate.githubUrl || user.githubUrl || "";
    candidate.linkedinUrl = structuredData.linkedinUrl || candidate.linkedinUrl || user.linkedinUrl || "";
    candidate.title = structuredData.title || candidate.title || user.title || "";
    candidate.location = structuredData.location || candidate.location || user.location || "";
    candidate.technicalSkills = mergedTechnicalSkills;
    candidate.skills = mergedSkills;
    candidate.experience = Array.isArray(structuredData.experience) ? structuredData.experience : (candidate.experience || []);
    candidate.education = Array.isArray(structuredData.education) ? structuredData.education : (candidate.education || []);
    candidate.projects = Array.isArray(structuredData.projects) ? structuredData.projects : (candidate.projects || []);
    candidate.extraCurricular = Array.isArray(structuredData.extraCurricular) ? structuredData.extraCurricular : (candidate.extraCurricular || []);
    candidate.summary = structuredData.summary || candidate.summary || "";
    candidate.resumeText = structuredData.summary || "Resume uploaded";
    candidate.resumePath = file.name || "";

    try {
      await candidate.save();
    } catch (saveErr: any) {
      console.error("[Resume Upload Route] Candidate save error:", saveErr.message);
    }

    // Keep user in sync
    user.fullName = candidate.name || user.fullName;
    user.phone = candidate.phone || user.phone;
    user.title = candidate.title || user.title;
    user.location = candidate.location || user.location;
    user.githubUrl = candidate.githubUrl || user.githubUrl;
    user.linkedinUrl = candidate.linkedinUrl || user.linkedinUrl;
    user.technicalSkills = candidate.technicalSkills || [];
    user.skills = candidate.skills || [];
    user.bio = candidate.summary || user.bio;
    user.experience = candidate.experience || [];
    user.education = candidate.education || [];
    user.projects = candidate.projects || [];
    user.extraCurricular = candidate.extraCurricular || [];
    user.resumeUrl = file.name || user.resumeUrl;

    try {
      await user.save();
    } catch (userSaveErr: any) {
      console.warn("[Resume Upload Route] User save warning:", userSaveErr.message);
    }

    console.log('[Resume Upload Route] Upload and profile sync complete!');
    return NextResponse.json({
      success: true,
      message: "Resume uploaded and profile updated successfully",
      candidate
    });

  } catch (err: any) {
    console.error('[Resume Upload Route Error]', err);
    return NextResponse.json({
      success: false,
      message: err.message || "Failed to upload resume"
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
