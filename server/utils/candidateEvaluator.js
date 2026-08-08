const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function evaluateCandidate(candidate, job) {

  const prompt = `
Evaluate this candidate against the job description.

Return JSON with fields:
interviewReadiness (0-100)
strengths (array)
weaknesses (array)
recommendation

Job:
${job.description}

Candidate Summary:
${candidate.summary}

Skills:
${candidate.skills.join(", ")}

Experience:
${candidate.experience.map(e => `${e.title} at ${e.company}`).join(", ")}

Education:
${candidate.education.map(e => e.degree).join(", ")}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt
  });

  let text = response.text;

  text = text.replace(/```json/g, "").replace(/```/g, "");

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Evaluation parsing error:", err);
    return {};
  }

}

module.exports = { evaluateCandidate };