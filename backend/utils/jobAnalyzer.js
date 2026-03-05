const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function analyzeJob(jobDescription) {

  const prompt = `
Extract structured information from this job description.

Return JSON with the following fields:

title
skills (array)
experienceRequired (number in years)
education
summary

Job Description:
${jobDescription}
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
    console.error("Job parsing error:", err);
    return {};
  }
}

module.exports = { analyzeJob };