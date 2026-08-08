import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

export interface ParsedResume {
    fullName: string;
    email: string;
    phone: string;
    skills: string[];
}

const COMMON_SKILLS = [
    "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "C++",
    "C#", "SQL", "NoSQL", "MongoDB", "PostgreSQL", "AWS", "Azure", "GCP",
    "Docker", "Kubernetes", "HTML", "CSS", "Tailwind", "Git", "REST", "GraphQL",
    "Go", "Rust", "Ruby", "PHP", "Angular", "Vue", "Next.js", "Express", "Spring",
    "Django", "Flask", "Machine Learning", "Data Science", "Agile", "Scrum"
];

export async function extractTextFromPDF(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async function () {
            try {
                const typedarray = new Uint8Array(reader.result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument({
                    data: typedarray,
                    // If complex fonts are needed, fall back to unpkg instead of cdnjs
                    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
                }).promise;

                let fullText = "";

                // Extract text from all pages
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(" ");
                    fullText += pageText + "\n";
                }

                resolve(fullText);
            } catch (error) {
                console.error("Error parsing PDF:", error);
                reject(error);
            }
        };

        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

export function parseResumeProfile(text: string): ParsedResume {
    // 1. Email Extraction
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = text.match(emailRegex);
    const email = emailMatch ? emailMatch[0] : "";

    // 2. Phone Extraction - handles varying formats like (555) 123-4567, 555-123-4567, +1 555 123 4567
    const phoneRegex = /(\+\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/;
    const phoneMatch = text.match(phoneRegex);
    const phone = phoneMatch ? phoneMatch[0] : "";

    // 3. Name Extraction Heuristics
    // A simple heuristic: Look for 2-3 capitalized words near the beginning of the text,
    // before the first newline or within the first 100 characters, ignoring common resume headings.
    let fullName = "";
    const firstLines = text.substring(0, 500).split(/\r?\n| /);

    // Clean up fragments and try to find a sequence of Title Cased words
    const potentialNameParts = [];
    for (const word of firstLines) {
        const cleanWord = word.replace(/[^a-zA-Z]/g, '');
        if (cleanWord.length > 1 && cleanWord[0] === cleanWord[0].toUpperCase() && cleanWord.slice(1) === cleanWord.slice(1).toLowerCase()) {
            // Ignore words like "Resume", "Curriculum", "Vitae", "Profile"
            if (!["Resume", "Curriculum", "Vitae", "Profile", "Email", "Phone", "Mobile"].includes(cleanWord)) {
                potentialNameParts.push(cleanWord);
            }
        } else if (potentialNameParts.length >= 2) {
            // If we already have 2 parts (First Last), and this word breaks the pattern, stop looking
            break;
        }
    }

    if (potentialNameParts.length >= 2) {
        fullName = potentialNameParts.slice(0, 3).join(" "); // Take First Middle Last optionally
    }

    // 4. Skills Extraction
    const textLower = text.toLowerCase();
    const extractedSkills = COMMON_SKILLS.filter(skill => {
        // Escaping regex special characters in the skill name (like C++)
        const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const skillPattern = new RegExp(`\\b${escapedSkill}\\b`, 'i');
        return skillPattern.test(text);
    });

    return {
        fullName,
        email,
        phone,
        skills: extractedSkills
    };
}
