import { useEffect, useState } from "react";
import { User, Mail, Phone, Briefcase, GraduationCap, Award, Edit2, Save, Building2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../utils/apiClient";
import { RecruiterHeader } from "../components/RecruiterHeader";

type Experience = { title: string; company: string; period: string; description: string };
type Education = { degree: string; institution: string; year: string };
type Project = { name: string; description: string };

type RecruiterProfileState = {
  name: string;
  email: string;
  phone: string;
  title: string;
  summary: string;
  githubUrl: string;
  linkedinUrl: string;
  companyName: string;
  companyDescription: string;
  website: string;
  location: string;
  technicalSkills: string[];
  skills: string[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  extraCurricular: string[];
};

const defaultProfile: RecruiterProfileState = {
  name: "",
  email: "",
  phone: "",
  title: "",
  summary: "",
  githubUrl: "",
  linkedinUrl: "",
  companyName: "",
  companyDescription: "",
  website: "",
  location: "",
  technicalSkills: [],
  skills: [],
  experience: [],
  education: [],
  projects: [],
  extraCurricular: []
};

const normalizeExternalUrl = (url: string) => {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const listToText = (list: string[]) => (Array.isArray(list) ? list.join("\n") : "");
const textToList = (value: string) =>
  String(value || "")
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);

const projectsToText = (projects: Project[]) =>
  (projects || [])
    .map((p) => `${String(p?.name || "").trim()} | ${String(p?.description || "").trim()}`.trim())
    .filter(Boolean)
    .join("\n");

const textToProjects = (value: string): Project[] =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...desc] = line.split("|");
      return { name: String(name || "").trim(), description: String(desc.join("|") || "").trim() };
    })
    .filter((p) => p.name || p.description);

const experienceToText = (experience: Experience[]) =>
  (experience || [])
    .map((e) =>
      [
        String(e?.title || "").trim(),
        String(e?.company || "").trim(),
        String(e?.period || "").trim(),
        String(e?.description || "").trim()
      ].join(" | ")
    )
    .join("\n");

const textToExperience = (value: string): Experience[] =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, company, period, ...desc] = line.split("|").map((x) => x.trim());
      return {
        title: title || "",
        company: company || "",
        period: period || "",
        description: desc.join(" | ").trim()
      };
    })
    .filter((e) => e.title || e.company || e.period || e.description);

const educationToText = (education: Education[]) =>
  (education || [])
    .map((e) => [String(e?.degree || "").trim(), String(e?.institution || "").trim(), String(e?.year || "").trim()].join(" | "))
    .join("\n");

const textToEducation = (value: string): Education[] =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [degree, institution, year] = line.split("|").map((x) => x.trim());
      return { degree: degree || "", institution: institution || "", year: year || "" };
    })
    .filter((e) => e.degree || e.institution || e.year);

export function RecruiterProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<RecruiterProfileState>(defaultProfile);
  const [skillsInput, setSkillsInput] = useState("");
  const [projectsInput, setProjectsInput] = useState("");
  const [experienceInput, setExperienceInput] = useState("");
  const [educationInput, setEducationInput] = useState("");
  const [extraInput, setExtraInput] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await apiClient.get("/recruiter/profile");
        if (!mounted) return;
        if (res?.profile) {
          const p = res.profile;
          const normalized: RecruiterProfileState = {
            ...defaultProfile,
            ...p,
            technicalSkills: Array.isArray(p.technicalSkills) ? p.technicalSkills : (Array.isArray(p.skills) ? p.skills : []),
            skills: Array.isArray(p.skills) ? p.skills : [],
            experience: Array.isArray(p.experience) ? p.experience : [],
            education: Array.isArray(p.education) ? p.education : [],
            projects: Array.isArray(p.projects) ? p.projects : [],
            extraCurricular: Array.isArray(p.extraCurricular) ? p.extraCurricular : []
          };
          setProfile(normalized);
          setSkillsInput(listToText(normalized.technicalSkills));
          setProjectsInput(projectsToText(normalized.projects));
          setExperienceInput(experienceToText(normalized.experience));
          setEducationInput(educationToText(normalized.education));
          setExtraInput(listToText(normalized.extraCurricular));
        }
      } catch (err) {
        console.error("Recruiter profile fetch error:", err);
        toast.error("Failed to load recruiter profile");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    try {
      const parsedSkills = textToList(skillsInput);
      const payload = {
        ...profile,
        technicalSkills: parsedSkills,
        skills: parsedSkills,
        projects: textToProjects(projectsInput),
        experience: textToExperience(experienceInput),
        education: textToEducation(educationInput),
        extraCurricular: textToList(extraInput)
      };
      const res = await apiClient.put("/recruiter/profile", payload);
      if (res?.profile) {
        const p = res.profile;
        const normalized: RecruiterProfileState = {
          ...defaultProfile,
          ...p,
          technicalSkills: Array.isArray(p.technicalSkills) ? p.technicalSkills : (Array.isArray(p.skills) ? p.skills : []),
          skills: Array.isArray(p.skills) ? p.skills : [],
          experience: Array.isArray(p.experience) ? p.experience : [],
          education: Array.isArray(p.education) ? p.education : [],
          projects: Array.isArray(p.projects) ? p.projects : [],
          extraCurricular: Array.isArray(p.extraCurricular) ? p.extraCurricular : []
        };
        setProfile(normalized);
        setSkillsInput(listToText(normalized.technicalSkills));
        setProjectsInput(projectsToText(normalized.projects));
        setExperienceInput(experienceToText(normalized.experience));
        setEducationInput(educationToText(normalized.education));
        setExtraInput(listToText(normalized.extraCurricular));
      }
      setIsEditing(false);
      toast.success("Recruiter profile updated");
    } catch (err) {
      console.error("Recruiter profile save error:", err);
      toast.error("Failed to update recruiter profile");
    }
  };

  if (loading) return <div className="p-6">Loading profile...</div>;

  const githubUrl = normalizeExternalUrl(profile.githubUrl || "");
  const linkedinUrl = normalizeExternalUrl(profile.linkedinUrl || "");
  const websiteUrl = normalizeExternalUrl(profile.website || "");
  const skills = profile.technicalSkills || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RecruiterHeader />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-12 h-12 text-white" />
                </div>
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="text-3xl font-bold text-gray-900 dark:text-white mb-2 border-b-2 border-red-600 bg-transparent"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{profile.name || "Recruiter"}</h1>
                  )}
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.title}
                      onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                      className="text-xl text-gray-600 dark:text-gray-400 mb-4 border-b border-red-600 bg-transparent"
                      placeholder="Role / title"
                    />
                  ) : (
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">{profile.title}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{profile.email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span>{profile.phone}</span>
                    </div>
                    {profile.location && <span>{profile.location}</span>}
                    {(githubUrl || linkedinUrl || websiteUrl) && (
                      <span className="inline-flex items-center gap-3 whitespace-nowrap">
                        {githubUrl && (
                          <a className="underline font-medium" href={githubUrl} target="_blank" rel="noreferrer noopener">GitHub</a>
                        )}
                        {linkedinUrl && (
                          <a className="underline font-medium" href={linkedinUrl} target="_blank" rel="noreferrer noopener">LinkedIn</a>
                        )}
                        {websiteUrl && (
                          <a className="underline font-medium" href={websiteUrl} target="_blank" rel="noreferrer noopener">Website</a>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                <span>{isEditing ? "Save Profile" : "Edit Profile"}</span>
              </button>
            </div>
          </div>

          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">About</h2>
            {isEditing ? (
              <textarea
                value={profile.summary}
                onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-400">{profile.summary || "No summary added yet."}</p>
            )}
          </div>

          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Company</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Company Name</label>
                {isEditing ? (
                  <input
                    value={profile.companyName || ""}
                    onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">{profile.companyName || "Not set"}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Location</label>
                {isEditing ? (
                  <input
                    value={profile.location || ""}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">{profile.location || "Not set"}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Company Description</label>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={profile.companyDescription || ""}
                    onChange={(e) => setProfile({ ...profile, companyDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">{profile.companyDescription || "Not set"}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
              <Briefcase className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Work Experience</h2>
            </div>
            {isEditing ? (
              <textarea
                rows={5}
                value={experienceInput}
                onChange={(e) => setExperienceInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                placeholder="Role | Company | Period | One-line description"
              />
            ) : (profile.experience || []).length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No experience added yet.</p>
            ) : (
              <div className="space-y-4">
                {profile.experience.map((exp, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{exp.title || "Role"}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{exp.company || "Company"}</p>
                    {exp.period && <p className="text-sm text-gray-500 dark:text-gray-500">{exp.period}</p>}
                    {exp.description && <p className="text-gray-600 dark:text-gray-400 mt-1">{exp.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
              <GraduationCap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Education</h2>
            </div>
            {isEditing ? (
              <textarea
                rows={4}
                value={educationInput}
                onChange={(e) => setEducationInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                placeholder="Degree | Institution | Year"
              />
            ) : (profile.education || []).length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No education added yet.</p>
            ) : (
              <div className="space-y-4">
                {profile.education.map((edu, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{edu.degree || "Degree"}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{edu.institution || "Institution"}</p>
                    {edu.year && <p className="text-sm text-gray-500 dark:text-gray-500">{edu.year}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
              <Award className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Technical Skills</h2>
            </div>
            {isEditing ? (
              <textarea
                rows={4}
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                placeholder="One skill per line (or comma separated)"
              />
            ) : skills.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No technical skills added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Projects</h2>
            {isEditing ? (
              <textarea
                rows={5}
                value={projectsInput}
                onChange={(e) => setProjectsInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                placeholder="Project title | One-line description"
              />
            ) : (profile.projects || []).length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No projects added yet.</p>
            ) : (
              <div className="space-y-4">
                {profile.projects.map((project, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{project.name || "Project"}</h3>
                    {project.description && <p className="text-gray-600 dark:text-gray-400">{project.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Extra Curricular</h2>
            {isEditing ? (
              <textarea
                rows={4}
                value={extraInput}
                onChange={(e) => setExtraInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                placeholder="One activity per line"
              />
            ) : (profile.extraCurricular || []).length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No extra curricular activities added yet.</p>
            ) : (
              <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 space-y-1">
                {profile.extraCurricular.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecruiterProfile;
