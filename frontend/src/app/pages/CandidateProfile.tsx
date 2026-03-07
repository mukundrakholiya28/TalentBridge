import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { DashboardHeader } from "../components/DashboardHeader";
import { User, Mail, Phone, Briefcase, GraduationCap, Award, Edit2, Save, Sparkles, Camera, Plus, X, MapPin, Link } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../utils/apiClient";
import { getAuthToken, getStoredUser, updateStoredUser } from "../../utils/authStorage";

export function CandidateProfile() {
  const splitProjectsAndSkills = (
    projects: Array<{ name?: string; description?: string }>,
    technicalSkills: string[]
  ) => {
    const skills = [...technicalSkills];
    const filteredProjects: Array<{ name: string; description: string }> = [];
    const skillSet = new Set(skills.map((s) => s.trim().toLowerCase()).filter(Boolean));
    const skillHeadingRegex = /technical\s*skills?|skills?\s*&\s*interests?|languages?|tools?|frameworks?|technologies?/i;
    const sentenceLikeRegex = /^(built|developed|engineered|implemented|designed|created|worked|optimized|and)\b/i;
    const extractSkillsFromText = (text: string) =>
      String(text || "")
        .replace(/^(technical\s*skills?|skills?\s*&\s*interests?|languages?|tools?|frameworks?|technologies?)\s*:\s*/i, "")
        .split(/[,/|;•]+/)
        .map((s) => s.trim())
        .filter(Boolean);

    for (const project of projects || []) {
      const name = String(project?.name || "").trim();
      const description = String(project?.description || "").trim();
      if (!name && !description) continue;

      const nameKey = name.toLowerCase();
      const headingLike = skillHeadingRegex.test(name) || skillHeadingRegex.test(description);
      const extractedFromName = extractSkillsFromText(name);
      const extractedFromDescription = extractSkillsFromText(description);
      const likelySkillsList =
        headingLike ||
        (!!name && /^languages?\s*:/i.test(name)) ||
        (!!description && /^languages?\s*:/i.test(description));
      const looksLikeSkillOnly =
        !!name &&
        (
          likelySkillsList ||
          (!description && skillSet.has(nameKey))
        );

      if (looksLikeSkillOnly) {
        const candidates = [...extractedFromName, ...extractedFromDescription];
        if (candidates.length === 0 && name) {
          candidates.push(name);
        }
        for (const item of candidates) {
          if (!item || sentenceLikeRegex.test(item) || item.split(/\s+/).length > 6) continue;
          const k = item.toLowerCase();
          if (!skillSet.has(k)) {
            skillSet.add(k);
            skills.push(item);
          }
        }
      } else {
        filteredProjects.push({ name, description });
      }
    }

    return { projects: filteredProjects, technicalSkills: skills };
  };
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    githubUrl: "",
    linkedinUrl: "",
    location: "",
    title: "",
    summary: "",
    avatarUrl: "",
    experience: [] as Array<{ title: string; company: string; period: string; description: string }>,
    education: [] as Array<{ degree: string; institution: string; year: string }>,
    projects: [] as Array<{ name: string; description: string }>,
    extraCurricular: [] as string[],
    technicalSkills: [] as string[],
    skills: [] as string[]
  });

  const [isParsing, setIsParsing] = useState(false);

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const candidateId = searchParams.get('id');

  // Only show navigation for candidate users, not recruiters viewing the profile
  const isRecruiterView = location.pathname.includes('/candidate/profile') && candidateId !== null;

  useEffect(() => {
    if (candidateId) {
      fetchCandidateProfile(candidateId);
      return;
    }
    fetchOwnProfile();
  }, [candidateId]);

  const fetchOwnProfile = async () => {
    try {
      const data = await apiClient.get('/candidate/profile');
      if (data?.profile) {
        setProfile((prev) => ({
          ...prev,
          ...data.profile,
          experience: Array.isArray(data.profile.experience) ? data.profile.experience : [],
          education: Array.isArray(data.profile.education) ? data.profile.education : [],
          projects: Array.isArray(data.profile.projects) ? data.profile.projects : [],
          extraCurricular: Array.isArray(data.profile.extraCurricular) ? data.profile.extraCurricular : [],
          technicalSkills: Array.isArray(data.profile.technicalSkills) ? data.profile.technicalSkills : (Array.isArray(data.profile.skills) ? data.profile.skills : []),
          skills: Array.isArray(data.profile.skills) ? data.profile.skills : []
        }));
        if (data.profile.avatarUrl) {
          updateStoredUser({ avatarUrl: data.profile.avatarUrl });
        }
      }
    } catch (error) {
      console.error("Error fetching own profile:", error);
    }
  };

  const fetchCandidateProfile = async (id: string) => {
    try {
      const data = await apiClient.get(`/candidate/profile/${id}`);
      if (data?.profile) {
        setProfile((prev) => ({
          ...prev,
          ...data.profile,
          experience: Array.isArray(data.profile.experience) ? data.profile.experience : [],
          education: Array.isArray(data.profile.education) ? data.profile.education : [],
          projects: Array.isArray(data.profile.projects) ? data.profile.projects : [],
          extraCurricular: Array.isArray(data.profile.extraCurricular) ? data.profile.extraCurricular : [],
          technicalSkills: Array.isArray(data.profile.technicalSkills) ? data.profile.technicalSkills : (Array.isArray(data.profile.skills) ? data.profile.skills : []),
          skills: Array.isArray(data.profile.skills) ? data.profile.skills : []
        }));
      }
    } catch (error) {
      console.error("Error fetching candidate profile:", error);
      toast.error("Failed to load candidate profile");
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...profile,
        technicalSkills: visibleTechnicalSkills,
        skills: visibleTechnicalSkills,
        projects: normalizedProjects,
        avatarUrl: profile.avatarUrl
      };
      const data = await apiClient.put('/candidate/profile', payload);
      if (data?.profile) {
        setProfile((prev) => ({
          ...prev,
          ...data.profile,
          experience: Array.isArray(data.profile.experience) ? data.profile.experience : [],
          education: Array.isArray(data.profile.education) ? data.profile.education : [],
          projects: Array.isArray(data.profile.projects) ? data.profile.projects : [],
          extraCurricular: Array.isArray(data.profile.extraCurricular) ? data.profile.extraCurricular : [],
          technicalSkills: Array.isArray(data.profile.technicalSkills) ? data.profile.technicalSkills : (Array.isArray(data.profile.skills) ? data.profile.skills : []),
          skills: Array.isArray(data.profile.skills) ? data.profile.skills : []
        }));
        updateStoredUser({ avatarUrl: data.profile.avatarUrl });
        window.dispatchEvent(new CustomEvent('user-updated', { detail: { avatarUrl: data.profile.avatarUrl } }));
      }
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleSimulateResumeParse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.info("Only PDF files support auto-parsing currently.");
      return;
    }

    setIsParsing(true);
    toast.loading("AI is parsing your resume...", { id: "parse-toast" });
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No auth token');

      const fd = new FormData();
      fd.append('resume', file);
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/upload-resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(data?.message || `Resume upload failed (${resp.status})`);
      }
      if (data?.success && data?.candidate) {
        setProfile((prev) => ({
          ...prev,
          ...data.candidate,
          experience: Array.isArray(data.candidate.experience) ? data.candidate.experience : [],
          education: Array.isArray(data.candidate.education) ? data.candidate.education : [],
          projects: Array.isArray(data.candidate.projects) ? data.candidate.projects : [],
          extraCurricular: Array.isArray(data.candidate.extraCurricular) ? data.candidate.extraCurricular : [],
          technicalSkills: Array.isArray(data.candidate.technicalSkills) ? data.candidate.technicalSkills : (Array.isArray(data.candidate.skills) ? data.candidate.skills : []),
          skills: Array.isArray(data.candidate.skills) ? data.candidate.skills : []
        }));
        toast.success("Resume parsed with Gemini and profile saved.", { id: "parse-toast" });
      } else {
        throw new Error(data?.message || data?.error || 'Resume upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to parse/upload resume file. Try another PDF.", { id: "parse-toast" });
    } finally {
      setIsParsing(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setProfile((prev) => ({ ...prev, avatarUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const normalizeExternalUrl = (url: string) => {
    const trimmed = String(url || "").trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const githubUrl = normalizeExternalUrl(profile.githubUrl || "");
  const linkedinUrl = normalizeExternalUrl(profile.linkedinUrl || "");

  const visibleExperience = (profile.experience || []).filter(
    (exp) => exp?.title || exp?.company || exp?.period || exp?.description
  );
  const normalizeExperienceItem = (exp: any) => {
    const directTitle = String(exp?.title || "").trim();
    const directCompany = String(exp?.company || "").trim();
    const directPeriod = String(exp?.period || "").trim();
    const directDescription = String(exp?.description || "").trim();

    const hasStructuredFields = directTitle || directCompany || directPeriod;
    const source = [directTitle, directCompany, directPeriod, directDescription]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!source) {
      return { title: "Role", company: "Company", period: "", description: "" };
    }

    const dashSplit = source.split(/\s*[—-]\s*/);
    const left = dashSplit[0]?.trim() || "";
    const right = dashSplit.slice(1).join(" - ").trim();

    const periodMatch = left.match(/\b(19|20)\d{2}\s*[-–—]?\s*(present|current|(19|20)\d{2})?\b/i);
    const matchedPeriod = periodMatch?.[0] || "";
    const parsedPeriod = matchedPeriod ? matchedPeriod.replace(/\s+/g, "") : directPeriod;
    const leftWithoutPeriod = matchedPeriod ? left.replace(matchedPeriod, "").trim() : left;

    let company = directCompany;
    let title = directTitle;
    let description = directDescription || right;

    if (!hasStructuredFields || (directTitle && directTitle.toLowerCase() === "role")) {
      const roleKeywords = [
        "co-founder", "founder", "member", "intern", "engineer", "developer",
        "manager", "lead", "analyst", "consultant", "designer", "researcher"
      ];
      const parts = leftWithoutPeriod.split(/\s+/).filter(Boolean);
      const lower = leftWithoutPeriod.toLowerCase();

      let roleStart = -1;
      for (const key of roleKeywords) {
        const idx = lower.indexOf(key);
        if (idx >= 0) {
          roleStart = idx;
          break;
        }
      }

      if (roleStart >= 0) {
        company = leftWithoutPeriod.slice(0, roleStart).trim() || company;
        const roleAndMaybeLocation = leftWithoutPeriod.slice(roleStart).trim();
        const roleTokens = roleAndMaybeLocation.split(/\s+/);
        title = roleTokens.slice(0, 2).join(" ").trim() || title;
      } else {
        if (!company && parts.length) company = parts.slice(0, Math.max(1, parts.length - 1)).join(" ");
        if (!title && parts.length) title = parts[parts.length - 1];
      }
    }

    company = company || "Company";
    title = title || "Role";
    description = description || "";

    return {
      title,
      company,
      period: parsedPeriod || directPeriod || "",
      description
    };
  };
  const normalizedExperience = visibleExperience.map(normalizeExperienceItem);
  const visibleEducation = (profile.education || []).filter(
    (edu) => edu?.degree || edu?.institution || edu?.year
  );
  const visibleProjects = (profile.projects || []).filter(
    (project) => project?.name || project?.description
  );
  const isGenericProjectTitle = (value: string) => {
    const v = String(value || "").trim().toLowerCase();
    return !v || v === "project";
  };
  const cleanProjectDescription = (value: string) =>
    String(value || "").replace(/^[\s\-–•]+/, "").trim();
  const normalizeProjectsForDisplay = (
    projects: Array<{ name?: string; description?: string }>
  ) => {
    const result: Array<{ name: string; description: string }> = [];
    const looksLikeDescriptionOnly = (text: string) =>
      /^(built|developed|developing|engineered|implemented|designed|created|worked|optimized|led|conducted)\b/i.test(text.trim());
    const looksLikeContinuation = (text: string) =>
      /^(and|with|using|featuring|including|through|developing)\b/i.test(text.trim().toLowerCase());
    const startsLowercaseSentence = (text: string) => /^[a-z]/.test(text.trim());
    for (let i = 0; i < projects.length; i++) {
      const current = projects[i];
      const rawName = String(current?.name || "").trim();
      const rawDescription = String(current?.description || "").trim();
      const genericTitle = isGenericProjectTitle(rawName);

      let title = rawName;
      let description = cleanProjectDescription(rawDescription);

      // Handle parser output like: "Titanic Survival Prediction: ...".
      if (genericTitle && rawDescription.includes(":")) {
        const [maybeTitle, ...rest] = rawDescription.split(":");
        const extractedTitle = String(maybeTitle || "").trim();
        if (extractedTitle) {
          title = extractedTitle;
          description = cleanProjectDescription(rest.join(":"));
        }
      }

      // Handle next-line bullet descriptions paired with generic-title rows.
      const next = projects[i + 1];
      const nextName = String(next?.name || "").trim();
      const nextDescription = String(next?.description || "").trim();
      if (
        next &&
        isGenericProjectTitle(nextName) &&
        /^[\s\-–•]/.test(nextDescription) &&
        !isGenericProjectTitle(title)
      ) {
        description = cleanProjectDescription(nextDescription);
        i += 1;
      }

      // Merge description-only standalone entries into the previous project.
      if (
        !description &&
        looksLikeDescriptionOnly(title) &&
        result.length > 0
      ) {
        const prev = result[result.length - 1];
        prev.description = prev.description
          ? `${prev.description} ${title}`.trim()
          : title;
        continue;
      }

      if (
        !description &&
        looksLikeContinuation(title) &&
        result.length > 0
      ) {
        const prev = result[result.length - 1];
        prev.description = prev.description
          ? `${prev.description} ${title}`.trim()
          : title;
        continue;
      }

      if (
        !description &&
        startsLowercaseSentence(title) &&
        result.length > 0
      ) {
        const prev = result[result.length - 1];
        prev.description = prev.description
          ? `${prev.description} ${title}`.trim()
          : title;
        continue;
      }

      if (!isGenericProjectTitle(title) || description) {
        result.push({
          name: isGenericProjectTitle(title) ? "Project" : title,
          description
        });
      }
    }
    return result;
  };
  const moveProjectLikeSkillsToProjects = (
    technicalSkills: string[],
    projects: Array<{ name?: string; description?: string }>
  ) => {
    const remainingSkills: string[] = [];
    const projectList: Array<{ name: string; description: string }> = (projects || [])
      .map((p) => ({ name: String(p?.name || "").trim(), description: String(p?.description || "").trim() }))
      .filter((p) => p.name || p.description);

    const headingNoise = /technical\s*skills?|skills?\s*&\s*interests?|soft\s*skills?/i;
    const projectTitleLike = /(prediction|project|engine|model|analysis|classification|regression)/i;
    const descriptionLike = /^(built|developed|engineered|implemented|designed|created|worked|optimized|\-)/i;

    for (let i = 0; i < (technicalSkills || []).length; i++) {
      const item = String(technicalSkills[i] || "").trim();
      if (!item) continue;
      if (headingNoise.test(item)) continue;

      const next = String(technicalSkills[i + 1] || "").trim();
      const isProjectTitle = item.includes(":") && projectTitleLike.test(item);
      const isLongProjectish = false;

      if (isProjectTitle || isLongProjectish) {
        const [namePart, ...descParts] = item.split(":");
        let name = namePart.trim();
        let description = descParts.join(":").trim();

        if (!name) name = item;
        if (!description && next && descriptionLike.test(next)) {
          description = next.replace(/^[\-\s]+/, "").trim();
          i += 1;
        }

        projectList.push({ name, description });
        continue;
      }

      if (descriptionLike.test(item) && projectList.length > 0 && !projectList[projectList.length - 1].description) {
        projectList[projectList.length - 1].description = item.replace(/^[\-\s]+/, "").trim();
        continue;
      }

      if (item.split(/\s+/).length > 6 && !/[+#]/.test(item)) {
        continue;
      }

      remainingSkills.push(item);
    }

    const dedupSkills = [...new Set(remainingSkills)];
    return { technicalSkills: dedupSkills, projects: projectList };
  };
  const baseTechnicalSkills = (profile.technicalSkills?.length
    ? profile.technicalSkills
    : profile.skills || []
  ).filter(Boolean);
  const normalizedForView = splitProjectsAndSkills(visibleProjects, baseTechnicalSkills);
  const moved = moveProjectLikeSkillsToProjects(
    normalizedForView.technicalSkills,
    normalizedForView.projects
  );
  const normalizeSkillLabel = (skill: string) => {
    const raw = String(skill || "").trim();
    const key = raw.toLowerCase();
    const map: Record<string, string> = {
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
    return map[key] || raw;
  };
  const normalizedProjects = normalizeProjectsForDisplay(moved.projects);
  const projectTextForFiltering = normalizedProjects
    .map((p) => `${String(p?.name || "")} ${String(p?.description || "")}`.toLowerCase())
    .join(" ");
  const methodTerms = new Set(["early stopping", "feature encoding"]);
  const visibleTechnicalSkills = [
    ...new Set(
      moved.technicalSkills
        .map(normalizeSkillLabel)
        .filter((skill) => {
          const k = String(skill || "").toLowerCase();
          return !(methodTerms.has(k) && projectTextForFiltering.includes(k));
        })
    )
  ];
  const visibleExtraCurricular = (profile.extraCurricular || []).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {!isRecruiterView && <DashboardHeader />}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isRecruiterView && (
          <button
            onClick={() => window.history.back()}
            className="text-blue-600 hover:underline mb-4 block"
          >
            ← Back to Applications
          </button>
        )}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          {/* Header */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-6">
                <div className="relative group">
                  <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-12 h-12 text-white" />
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-xs">Change</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </label>
                  )}
                </div>
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 border-b-2 border-blue-600 bg-transparent"
                    />
                  ) : (
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {profile.name}
                    </h1>
                  )}
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.title}
                      onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                      className="text-xl text-gray-600 dark:text-gray-400 mb-4 border-b border-blue-600 bg-transparent"
                    />
                  ) : (
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                      {profile.title}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{profile.email}</span>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        <input
                          type="text"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          placeholder="Phone"
                          className="bg-transparent border-b border-blue-600 text-gray-900 dark:text-white text-sm w-32"
                        />
                      </div>
                    ) : (
                      profile.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          <span>{profile.phone}</span>
                        </div>
                      )
                    )}
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <input
                          type="text"
                          value={profile.location}
                          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                          placeholder="Location"
                          className="bg-transparent border-b border-blue-600 text-gray-900 dark:text-white text-sm w-32"
                        />
                      </div>
                    ) : (
                      profile.location && <span>{profile.location}</span>
                    )}
                    {isEditing ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Link className="w-4 h-4" />
                          <input
                            type="text"
                            value={profile.githubUrl}
                            onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                            placeholder="GitHub URL"
                            className="bg-transparent border-b border-blue-600 text-gray-900 dark:text-white text-sm w-40"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Link className="w-4 h-4" />
                          <input
                            type="text"
                            value={profile.linkedinUrl}
                            onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                            placeholder="LinkedIn URL"
                            className="bg-transparent border-b border-blue-600 text-gray-900 dark:text-white text-sm w-40"
                          />
                        </div>
                      </div>
                    ) : (
                      (githubUrl || linkedinUrl) && (
                        <span className="inline-flex items-center gap-3 whitespace-nowrap">
                          {githubUrl && (
                            <a className="underline font-medium" href={githubUrl} target="_blank" rel="noreferrer noopener">
                              GitHub Profile
                            </a>
                          )}
                          {linkedinUrl && (
                            <a className="underline font-medium" href={linkedinUrl} target="_blank" rel="noreferrer noopener">
                              LinkedIn Profile
                            </a>
                          )}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {!isRecruiterView && (
                  <>
                    <button
                      onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                      className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      {isEditing ? (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Profile</span>
                        </>
                      ) : (
                        <>
                          <Edit2 className="w-4 h-4" />
                          <span>Edit Details</span>
                        </>
                      )}
                    </button>

                    <div className="relative">
                      <input
                        type="file"
                        id="resume-parse"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={handleSimulateResumeParse}
                        disabled={isParsing}
                      />
                      <label
                        htmlFor="resume-parse"
                        className={`flex items-center justify-center w-full gap-2 px-4 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer transition ${isParsing ? 'opacity-70 pointer-events-none' : ''}`}
                      >
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium">{isParsing ? "Parsing..." : "Auto-fill from Resume"}</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              About
            </h2>
            {isEditing ? (
              <textarea
                value={profile.summary}
                onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                {profile.summary}
              </p>
            )}
          </div>

          {/* Experience */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Work Experience
                </h2>
              </div>
              {isEditing && (
                <button
                  onClick={() => setProfile({ ...profile, experience: [...profile.experience, { title: "", company: "", period: "", description: "" }] })}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-4">
                {profile.experience.map((exp, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-2 relative">
                    <button
                      onClick={() => setProfile({ ...profile, experience: profile.experience.filter((_, i) => i !== index) })}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      value={exp.title}
                      onChange={(e) => { const updated = [...profile.experience]; updated[index] = { ...updated[index], title: e.target.value }; setProfile({ ...profile, experience: updated }); }}
                      placeholder="Job Title"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => { const updated = [...profile.experience]; updated[index] = { ...updated[index], company: e.target.value }; setProfile({ ...profile, experience: updated }); }}
                      placeholder="Company"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <input
                      type="text"
                      value={exp.period}
                      onChange={(e) => { const updated = [...profile.experience]; updated[index] = { ...updated[index], period: e.target.value }; setProfile({ ...profile, experience: updated }); }}
                      placeholder="Period (e.g. 2022–2024)"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <textarea
                      value={exp.description}
                      onChange={(e) => { const updated = [...profile.experience]; updated[index] = { ...updated[index], description: e.target.value }; setProfile({ ...profile, experience: updated }); }}
                      placeholder="Description"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </div>
                ))}
                {profile.experience.length === 0 && <p className="text-gray-500 dark:text-gray-400">No experience added yet. Click "Add" to start.</p>}
              </div>
            ) : normalizedExperience.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No experience added yet.</p>
            ) : (
              <div className="space-y-6">
                {normalizedExperience.map((exp, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{exp.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">{exp.company}</p>
                    {exp.period && <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">{exp.period}</p>}
                    {exp.description && (
                      <p className="text-gray-600 dark:text-gray-400">
                        {String(exp.description)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Education */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Education
                </h2>
              </div>
              {isEditing && (
                <button
                  onClick={() => setProfile({ ...profile, education: [...profile.education, { degree: "", institution: "", year: "" }] })}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-4">
                {profile.education.map((edu, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-2 relative">
                    <button
                      onClick={() => setProfile({ ...profile, education: profile.education.filter((_, i) => i !== index) })}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => { const updated = [...profile.education]; updated[index] = { ...updated[index], degree: e.target.value }; setProfile({ ...profile, education: updated }); }}
                      placeholder="Degree"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => { const updated = [...profile.education]; updated[index] = { ...updated[index], institution: e.target.value }; setProfile({ ...profile, education: updated }); }}
                      placeholder="Institution"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <input
                      type="text"
                      value={edu.year}
                      onChange={(e) => { const updated = [...profile.education]; updated[index] = { ...updated[index], year: e.target.value }; setProfile({ ...profile, education: updated }); }}
                      placeholder="Year (e.g. 2020–2024)"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </div>
                ))}
                {profile.education.length === 0 && <p className="text-gray-500 dark:text-gray-400">No education added yet. Click "Add" to start.</p>}
              </div>
            ) : visibleEducation.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No education added yet.</p>
            ) : (
              <div className="space-y-4">
                {visibleEducation.map((edu, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{edu.degree || "Degree"}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{edu.institution || "Institution"}</p>
                    {edu.year && <p className="text-sm text-gray-500 dark:text-gray-500">{edu.year}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Technical Skills
                </h2>
              </div>
            </div>
            {isEditing ? (
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.technicalSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm flex items-center gap-1"
                    >
                      {skill}
                      <button onClick={() => setProfile({ ...profile, technicalSkills: profile.technicalSkills.filter((_, i) => i !== index) })} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a skill and press Enter"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val && !profile.technicalSkills.includes(val)) {
                          setProfile({ ...profile, technicalSkills: [...profile.technicalSkills, val] });
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                </div>
              </div>
            ) : visibleTechnicalSkills.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No technical skills added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {visibleTechnicalSkills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                >
                  {skill}
                </span>
                ))}
              </div>
            )}
          </div>

          {/* Projects */}
          <div className="p-8 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Projects</h2>
              {isEditing && (
                <button
                  onClick={() => setProfile({ ...profile, projects: [...profile.projects, { name: "", description: "" }] })}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-4">
                {profile.projects.map((project, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-2 relative">
                    <button
                      onClick={() => setProfile({ ...profile, projects: profile.projects.filter((_, i) => i !== index) })}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) => { const updated = [...profile.projects]; updated[index] = { ...updated[index], name: e.target.value }; setProfile({ ...profile, projects: updated }); }}
                      placeholder="Project Name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <textarea
                      value={project.description}
                      onChange={(e) => { const updated = [...profile.projects]; updated[index] = { ...updated[index], description: e.target.value }; setProfile({ ...profile, projects: updated }); }}
                      placeholder="Description"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </div>
                ))}
                {profile.projects.length === 0 && <p className="text-gray-500 dark:text-gray-400">No projects added yet. Click "Add" to start.</p>}
              </div>
            ) : normalizedProjects.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No projects added yet.</p>
            ) : (
              <div className="space-y-4">
                {normalizedProjects.map((project, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{project.name || "Project"}</h3>
                    {project.description && <p className="text-gray-600 dark:text-gray-400">{String(project.description)}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extra Curricular */}
          <div className="p-8 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Extra Curricular</h2>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                {profile.extraCurricular.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => { const updated = [...profile.extraCurricular]; updated[index] = e.target.value; setProfile({ ...profile, extraCurricular: updated }); }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <button
                      onClick={() => setProfile({ ...profile, extraCurricular: profile.extraCurricular.filter((_, i) => i !== index) })}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setProfile({ ...profile, extraCurricular: [...profile.extraCurricular, ""] })}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
                >
                  <Plus className="w-4 h-4" /> Add Activity
                </button>
              </div>
            ) : visibleExtraCurricular.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No extra curricular activities added yet.</p>
            ) : (
              <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 space-y-1">
                {visibleExtraCurricular.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div >
    </div >
  );
}


