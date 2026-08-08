const { GoogleGenerativeAI } = require("@google/generative-ai");

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_MODEL_CANDIDATES = (process.env.GEMINI_MODEL_CANDIDATES ||
    `${GEMINI_MODEL},gemini-1.5-flash,gemini-1.5-pro`)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

const safeString = (value) => String(value || "").trim();
const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeExperience = (items) =>
    safeArray(items).map((item) => ({
        title: safeString(item?.title || item?.role || item?.jobTitle),
        company: safeString(item?.company || item?.organization),
        period: safeString(item?.period || item?.duration || item?.date),
        description: safeString(item?.description || item?.details || item?.summary)
    })).filter((x) => x.title || x.company || x.period || x.description);

const normalizeEducation = (items) =>
    safeArray(items).map((item) => ({
        degree: safeString(item?.degree || item?.program),
        institution: safeString(item?.institution || item?.school || item?.college),
        year: safeString(item?.year || item?.date || item?.period)
    })).filter((x) => x.degree || x.institution || x.year);

const normalizeProjects = (items) =>
    safeArray(items).map((item) => ({
        name: safeString(item?.name || item?.project || item?.title),
        description: safeString(item?.description || item?.details || item?.summary)
    })).filter((x) => x.name || x.description);

const normalizeSkills = (items) =>
    [...new Set(safeArray(items).map((s) => safeString(s)).filter(Boolean))];

const normalizeSkillLabel = (value) => {
    const raw = safeString(value);
    if (!raw) return "";
    const lower = raw.toLowerCase();
    const canon = {
        "feature encoding": "Feature Encoding",
        "early stopping": "Early Stopping",
        "gradient descent": "Gradient Descent",
        "logistic regression": "Logistic Regression",
        "linear regression": "Linear Regression",
        "machine learning": "Machine Learning",
        "deep learning": "Deep Learning",
        "data structures and algorithm": "Data Structures and Algorithms",
        "data structures and algorithms": "Data Structures and Algorithms",
        "git/github": "Git/GitHub",
        "c/c++": "C/C++"
    };
    if (canon[lower]) return canon[lower];
    return raw;
};

const dedupeProjects = (items) =>
    mergeUniqueObjects(
        items,
        [],
        (x) => `${safeString(x?.name).toLowerCase()}|${safeString(x?.description).toLowerCase()}`
    );

const cleanProfileSections = (profile) => {
    const skills = normalizeSkills(profile.technicalSkills || profile.skills || []).map(normalizeSkillLabel);
    const projects = normalizeProjects(profile.projects || []);
    const sectionHeadingRegex = /(technical\s*skills?|skills?\s*&\s*interests?|languages?|tools?|frameworks?|technologies?|soft\s*skills?)/i;
    const projectKeywordRegex = /(prediction|project|engine|model|analysis|classification|regression|system|pipeline)/i;
    const descriptionStartRegex = /^(built|developed|developing|engineered|implemented|designed|created|worked|optimized|led|conducted|and|with|using)\b/i;

    const skillSet = new Set(skills.map((s) => s.toLowerCase()));
    const normalizedProjects = [];

    for (let i = 0; i < projects.length; i++) {
        const current = projects[i];
        let name = safeString(current?.name);
        let description = safeString(current?.description);

        if ((name.toLowerCase() === "project" || !name) && description.includes(":")) {
            const [title, ...rest] = description.split(":");
            const extracted = safeString(title);
            if (extracted) {
                name = extracted;
                description = safeString(rest.join(":"));
            }
        }

        // Move skill-heading pseudo projects back into skills.
        if (sectionHeadingRegex.test(name) || sectionHeadingRegex.test(description)) {
            const candidateSkills = `${name}: ${description}`
                .replace(sectionHeadingRegex, "")
                .split(/[,/|]+/)
                .map((s) => safeString(s))
                .filter(Boolean);
            for (const skill of candidateSkills) {
                const key = skill.toLowerCase();
                if (!skillSet.has(key)) {
                    skillSet.add(key);
                    skills.push(skill);
                }
            }
            continue;
        }

        // Merge dangling description-only lines into previous project.
        if (
            normalizedProjects.length > 0 &&
            !description &&
            name &&
            (descriptionStartRegex.test(name) || name.split(/\s+/).length > 8)
        ) {
            const prev = normalizedProjects[normalizedProjects.length - 1];
            prev.description = prev.description ? `${prev.description} ${name}`.trim() : name;
            continue;
        }

        if (!name && !description) continue;
        normalizedProjects.push({ name: name || "Project", description });
    }

    // Move project-like noisy skill lines into projects only if they look like full project lines.
    const cleanedSkills = [];
    for (let i = 0; i < skills.length; i++) {
        const item = safeString(skills[i]);
        if (!item) continue;
        const looksProjectish =
            (item.includes(":") && projectKeywordRegex.test(item)) ||
            (projectKeywordRegex.test(item) && item.split(/\s+/).length > 8);

        if (looksProjectish) {
            const [title, ...rest] = item.split(":");
            const pName = safeString(title) || "Project";
            const pDesc = safeString(rest.join(":"));
            normalizedProjects.push({ name: pName, description: pDesc });
            continue;
        }

        // Skip sentence-like fragments in skills.
        if (/^(built|developed|engineered|implemented|designed|created|worked|optimized|and)\b/i.test(item)) {
            continue;
        }
        cleanedSkills.push(normalizeSkillLabel(item));
    }

    const projectText = normalizedProjects
        .map((p) => `${safeString(p.name)} ${safeString(p.description)}`.toLowerCase())
        .join(" ");
    const methodTerms = new Set(["early stopping", "feature encoding"]);
    const filteredSkills = cleanedSkills.filter((s) => {
        const k = safeString(s).toLowerCase();
        return !(methodTerms.has(k) && projectText.includes(k));
    });

    return {
        ...profile,
        technicalSkills: normalizeSkills(filteredSkills).map(normalizeSkillLabel),
        skills: normalizeSkills(filteredSkills).map(normalizeSkillLabel),
        projects: dedupeProjects(normalizedProjects)
    };
};

const extractJsonFromText = (raw) => {
    const text = String(raw || "").trim();
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) return fenced[1].trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0];
    throw new Error("AI returned invalid format");
};

const DEFAULT_PROFILE_REQUIREMENTS = [
    "Name",
    "Email ID",
    "Phone Number",
    "GitHub Profile Link",
    "LinkedIn Profile Link",
    "Education (all entries)",
    "Experience (all entries; each with one-line description)",
    "Projects (all entries; each with one-line description)",
    "Technical Skills (all)",
    "Extra Curricular (all)"
];

const callGeminiForJson = async (prompt) => {
    let lastError = null;

    console.log('[Gemini] Starting model call with candidates:', GEMINI_MODEL_CANDIDATES);
    
    for (const model of GEMINI_MODEL_CANDIDATES) {
        try {
            console.log('[Gemini] Trying model:', model);
            const genModel = ai.getGenerativeModel({ model });
            const result = await genModel.generateContent(prompt);
            const response = await result.response;
            const raw = response.text();
            console.log('[Gemini] Got response, length:', raw?.length || 0);
            const jsonString = extractJsonFromText(raw);
            const parsed = JSON.parse(jsonString);
            console.log('[Gemini] Successfully parsed JSON');
            return parsed;
        } catch (err) {
            console.error(`[Gemini] Model ${model} failed:`, err.message);
            lastError = err;
        }
    }

    console.error('[Gemini] All models failed, last error:', lastError?.message);
    throw lastError || new Error("Gemini model call failed");
};

const mergeUniqueObjects = (arrA, arrB, keyFn) => {
    const out = [];
    const seen = new Set();
    for (const item of [...safeArray(arrA), ...safeArray(arrB)]) {
        const key = keyFn(item);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(item);
    }
    return out;
};

const normalizeProfile = (parsed) => ({
    name: safeString(parsed?.name),
    email: safeString(parsed?.email),
    phone: safeString(parsed?.phone),
    githubUrl: safeString(parsed?.githubUrl),
    linkedinUrl: safeString(parsed?.linkedinUrl),
    technicalSkills: normalizeSkills(parsed?.technicalSkills),
    skills: normalizeSkills(parsed?.technicalSkills),
    experience: normalizeExperience(parsed?.experience || parsed?.workExperience || parsed?.work_experience || parsed?.experiences),
    education: normalizeEducation(parsed?.education || parsed?.educations),
    projects: normalizeProjects(parsed?.projects || parsed?.project),
    extraCurricular: normalizeSkills(parsed?.extraCurricular || parsed?.extracurricular || parsed?.activities || parsed?.achievements),
    summary: safeString(parsed?.summary)
});

const needsSectionBackfill = (profile) => ({
    experience: !safeArray(profile.experience).length,
    education: !safeArray(profile.education).length,
    projects: !safeArray(profile.projects).length,
    extraCurricular: !safeArray(profile.extraCurricular).length
});

const buildSectionPrompt = (section, text) => {
    const schemas = {
        experience: `{"experience":[{"title":"","company":"","period":"","description":""}]}`,
        education: `{"education":[{"degree":"","institution":"","year":""}]}`,
        projects: `{"projects":[{"name":"","description":""}]}`,
        extraCurricular: `{"extraCurricular":[]}`
    };

    const rules = {
        experience: "Extract ALL work experiences. Keep description one line.",
        education: "Extract ALL education entries.",
        projects: "Extract ALL projects. Keep description one line.",
        extraCurricular: "Extract ALL extracurricular/leadership/activities entries as short strings."
    };

    return `
Extract only the requested section from this resume text.
Section: ${section}
Rule: ${rules[section]}

Return ONLY valid JSON in this exact schema:
${schemas[section]}

Resume Text:
${text}
`;
};

async function analyzeResume(text, profileRequirements = DEFAULT_PROFILE_REQUIREMENTS) {
    const requirementsText = safeArray(profileRequirements)
        .map((item, index) => `${index + 1}. ${safeString(item)}`)
        .join("\n");

    const prompt = `
You are extracting candidate profile data for a website.

You are given TWO INPUTS:
INPUT A - REQUIRED PROFILE FIELDS:
${requirementsText}

INPUT B - RESUME TEXT:
${text}

Return ONLY valid JSON (no markdown, no explanation) in EXACTLY this schema:

{
  "name": "",
  "email": "",
  "phone": "",
 "githubUrl": "",
 "linkedinUrl": "",
 "technicalSkills": [],
 "experience": [{"title":"","company":"","period":"","description":""}],
 "education": [{"degree":"","institution":"","year":""}],
 "projects": [{"name":"","description":""}],
 "extraCurricular": [],
  "summary": ""
}

Rules:
- Fill all possible fields from the resume.
- Keep each experience.description and projects.description to ONE concise line.
- Keep links as full URLs when possible.
- Put items in technicalSkills only if they are explicitly listed as skills/technologies/tools/languages in the resume. Do not infer from project descriptions.
- Do not invent details not present in resume.
- If unknown, use empty string "" or empty array [].
`;

    const parsed = await callGeminiForJson(prompt);
    const profile = normalizeProfile(parsed);

    // If key sections are missing, run targeted extraction calls and merge.
    const missing = needsSectionBackfill(profile);
    for (const [section, needed] of Object.entries(missing)) {
        if (!needed) continue;
        try {
            const sectionRaw = await callGeminiForJson(buildSectionPrompt(section, text));
            const normalizedSection = normalizeProfile(sectionRaw);

            if (section === "experience") {
                profile.experience = mergeUniqueObjects(
                    profile.experience,
                    normalizedSection.experience,
                    (x) => `${x.title}|${x.company}|${x.period}|${x.description}`.toLowerCase()
                );
            } else if (section === "education") {
                profile.education = mergeUniqueObjects(
                    profile.education,
                    normalizedSection.education,
                    (x) => `${x.degree}|${x.institution}|${x.year}`.toLowerCase()
                );
            } else if (section === "projects") {
                profile.projects = mergeUniqueObjects(
                    profile.projects,
                    normalizedSection.projects,
                    (x) => `${x.name}|${x.description}`.toLowerCase()
                );
            } else if (section === "extraCurricular") {
                profile.extraCurricular = normalizeSkills([
                    ...profile.extraCurricular,
                    ...normalizedSection.extraCurricular
                ]);
            }
        } catch (err) {
            // Keep best-effort extraction if a section call fails.
        }
    }

    return cleanProfileSections(profile);
}

module.exports = { analyzeResume };
