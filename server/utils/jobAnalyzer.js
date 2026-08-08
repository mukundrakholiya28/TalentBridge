const { GoogleGenerativeAI } = require("@google/generative-ai");

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/g, "").replace(/```/g, "");

    return JSON.parse(text);
  } catch (err) {
    console.error("Job parsing error:", err);
    return {};
  }
}

module.exports = { analyzeJob };