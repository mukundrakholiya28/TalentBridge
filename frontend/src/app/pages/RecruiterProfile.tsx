import { useEffect, useState } from "react";
import { User, Mail, Phone, Edit2, Save, Building2, Camera, MapPin, Link } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../utils/apiClient";
import { RecruiterHeader } from "../components/RecruiterHeader";
import { updateStoredUser } from "../../utils/authStorage";

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
  avatarUrl: string;
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
  avatarUrl: ""
};

const normalizeExternalUrl = (url: string) => {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export function RecruiterProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<RecruiterProfileState>(defaultProfile);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await apiClient.get("/recruiter/profile");
        if (!mounted) return;
        if (res?.profile) {
          setProfile({
            ...defaultProfile,
            ...res.profile
          });
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
      const payload = {
        ...profile
      };
      const res = await apiClient.put("/recruiter/profile", payload);
      if (res?.profile) {
        setProfile({
          ...defaultProfile,
          ...res.profile
        });
        updateStoredUser({ avatarUrl: res.profile.avatarUrl });
        window.dispatchEvent(new CustomEvent('user-updated', { detail: { avatarUrl: res.profile.avatarUrl } }));
      }
      setIsEditing(false);
      toast.success("Recruiter profile updated");
    } catch (err) {
      console.error("Recruiter profile save error:", err);
      toast.error("Failed to update recruiter profile");
    }
  };

  if (loading) return <div className="p-6">Loading profile...</div>;

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

  const githubUrl = normalizeExternalUrl(profile.githubUrl || "");
  const linkedinUrl = normalizeExternalUrl(profile.linkedinUrl || "");
  const websiteUrl = normalizeExternalUrl(profile.website || "");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RecruiterHeader />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
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
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">{profile.name || "Recruiter"}</h1>
                  )}
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.title}
                      onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                      className="text-xl text-gray-600 dark:text-gray-400 mb-4 border-b border-blue-600 bg-transparent"
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
                        <div className="flex items-center gap-1">
                          <Link className="w-4 h-4" />
                          <input
                            type="text"
                            value={profile.website}
                            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                            placeholder="Website URL"
                            className="bg-transparent border-b border-blue-600 text-gray-900 dark:text-white text-sm w-40"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                <span>{isEditing ? "Save Profile" : "Edit Profile"}</span>
              </button>
            </div>
          </div>

          <div className="p-8 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">About</h2>
            {isEditing ? (
              <textarea
                value={profile.summary}
                onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-400">{profile.summary || "No summary added yet."}</p>
            )}
          </div>

          <div className="p-8">
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
        </div>
      </div>
    </div>
  );
}

export default RecruiterProfile;
