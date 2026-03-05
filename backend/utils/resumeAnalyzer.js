const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function analyzeResume(text) {

    const prompt = `
Extract structured information from this resume.

Return ONLY JSON in this format:

{
 "name": "",
 "skills": [],
 "experience": [],
 "education": [],
 "summary": ""
}

Resume:
${text}
`;

    const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt
    });

    let raw = response.text;

    // Remove markdown or extra text
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new Error("AI returned invalid format");
    }

    return JSON.parse(jsonMatch[0]);
}

module.exports = { analyzeResume };