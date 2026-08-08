const { GoogleGenerativeAI } = require("@google/generative-ai");

const getAiClient = () => {
    if (!process.env.GEMINI_API_KEY) return null;
    try {
        return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    } catch (err) {
        console.warn("Failed to initialize GoogleGenerativeAI client:", err.message);
        return null;
    }
};

async function evaluateCandidate(candidate, job) {
  const defaultFallback = {
    interviewReadiness: 75,
    strengths: ["Relevant technical skills", "Clear experience alignment"],
    weaknesses: ["Requires further deep-dive technical interview"],
    recommendation: "Consider for screening interview"
  };

  if (!candidate || !job) return defaultFallback;

  const candidateSkills = Array.isArray(candidate.skills) ? candidate.skills.join(", ") : "";
  const candidateExp = Array.isArray(candidate.experience)
    ? candidate.experience.map(e => `${e.title || "Role"} at ${e.company || "Company"}`).join(", ")
    : "";
  const candidateEdu = Array.isArray(candidate.education)
    ? candidate.education.map(e => e.degree || "Degree").join(", ")
    : "";

  const prompt = `
Evaluate this candidate against the job description.

Return JSON with fields:
interviewReadiness (0-100 number)
strengths (array of strings)
weaknesses (array of strings)
recommendation (string)

Job Description:
${job.description || job.title || "Software Engineering Role"}

Candidate Summary:
${candidate.summary || candidate.name || "Candidate Profile"}

Skills:
${candidateSkills}

Experience:
${candidateExp}

Education:
${candidateEdu}
`;

  try {
    const ai = getAiClient();
    if (!ai) return defaultFallback;

    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const model = ai.getGenerativeModel({ model: modelName });
    const response = await model.generateContent(prompt);
    let text = response.response ? response.response.text() : "";

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    if (!text) return defaultFallback;

    const parsed = JSON.parse(text);
    return {
      interviewReadiness: typeof parsed.interviewReadiness === "number" ? parsed.interviewReadiness : 75,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : defaultFallback.strengths,
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : defaultFallback.weaknesses,
      recommendation: parsed.recommendation || defaultFallback.recommendation
    };
  } catch (err) {
    console.error("Evaluation error:", err.message);
    return defaultFallback;
  }
}

module.exports = { evaluateCandidate };