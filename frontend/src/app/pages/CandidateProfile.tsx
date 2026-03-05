import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { DashboardHeader } from "../components/DashboardHeader";
import { User, Mail, Phone, MapPin, Briefcase, GraduationCap, Award, Edit2, Save, Upload, Sparkles, Camera } from "lucide-react";
import { toast } from "sonner";
import { extractTextFromPDF, parseResumeProfile } from "../../utils/resumeParser";

export function CandidateProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    title: "Senior Frontend Developer",
    summary: "Passionate frontend developer with 5+ years of experience building modern web applications. Specialized in React, TypeScript, and performance optimization.",
    experience: [
      {
        title: "Senior Frontend Developer",
        company: "Tech Corp",
        period: "2021 - Present",
        description: "Led development of customer-facing web applications using React and TypeScript"
      },
      {
        title: "Frontend Developer",
        company: "StartupXYZ",
        period: "2019 - 2021",
        description: "Built and maintained responsive web applications"
      }
    ],
    education: [
      {
        degree: "Bachelor of Science in Computer Science",
        institution: "Stanford University",
        year: "2019"
      }
    ],
    skills: [
      "React", "TypeScript", "JavaScript", "HTML/CSS", "Node.js",
      "Git", "REST APIs", "Responsive Design", "Performance Optimization"
    ]
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
    }
  }, [candidateId]);

  const fetchCandidateProfile = async (id: string) => {
    try {
      // In a real app, this would fetch from a /users/:id endpoint
      // For the mock, we simulate it
      /*
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8242c05/users/${id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const data = await response.json();
      if (data.success && data.user) {
        setProfile({
          ...profile,
          name: data.user.fullName || profile.name,
          email: data.user.email || profile.email,
        });
      }
      */
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

  const handleSimulateResumeParse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      setIsParsing(true);
      toast.loading("AI is parsing your resume...", { id: "parse-toast" });

      try {
        const text = await extractTextFromPDF(file);
        const parsedData = parseResumeProfile(text);

        setProfile(prev => ({
          ...prev,
          name: parsedData.fullName || prev.name,
          email: parsedData.email || prev.email,
          phone: parsedData.phone || prev.phone,
          skills: parsedData.skills.length > 0 ? Array.from(new Set([...prev.skills, ...parsedData.skills])) : prev.skills
        }));

        if (parsedData.fullName || parsedData.skills.length > 0) {
          toast.success("Resume parsed! We've updated your profile details.", { id: "parse-toast" });
        } else {
          toast.error("Couldn't extract recognizable details from PDF.", { id: "parse-toast" });
        }
      } catch (err) {
        console.error("PDF Parsing failed:", err);
        toast.error("Failed to read PDF file.", { id: "parse-toast" });
      } finally {
        setIsParsing(false);
      }
    } else {
      toast.info("Only PDF files support auto-parsing currently.");
    }
  };

  const handlePhotoUpload = () => {
    toast.success("Photo updated successfully!");
  };

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
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-6">
                <div className="relative group">
                  <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <User className="w-12 h-12 text-white" />
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
                      className="text-3xl font-bold text-gray-900 dark:text-white mb-2 border-b-2 border-blue-600 bg-transparent"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
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
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{profile.email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span>{profile.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.location}</span>
                    </div>
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
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
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
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
              <Briefcase className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Work Experience
              </h2>
            </div>
            <div className="space-y-6">
              {profile.experience.map((exp, index) => (
                <div key={index}>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {exp.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">
                    {exp.company}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">
                    {exp.period}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {exp.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
              <GraduationCap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Education
              </h2>
            </div>
            <div className="space-y-4">
              {profile.education.map((edu, index) => (
                <div key={index}>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {edu.degree}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {edu.institution}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {edu.year}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <Award className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Skills
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div >
    </div >
  );
}
