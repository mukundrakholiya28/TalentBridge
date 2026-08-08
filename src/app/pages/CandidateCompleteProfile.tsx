import React, { useState, useEffect } from 'react';
import { useNavigate } from "@/lib/router-compat";
import { apiClient } from '../../utils/apiClient';
import { toast } from 'sonner';
import { getAuthToken } from '../../utils/authStorage';

export const CandidateCompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>({
    name: '',
    email: '',
    phone: '',
    githubUrl: '',
    linkedinUrl: '',
    location: '',
    title: '',
    skills: [],
    technicalSkills: [],
    projects: [],
    extraCurricular: [],
    summary: ''
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [skillsInput, setSkillsInput] = useState('');
  const [projectsInput, setProjectsInput] = useState('');
  const [extraInput, setExtraInput] = useState('');

  const projectsToText = (projects: any[] = []) =>
    projects
      .map((p) => `${p?.name || ''}${p?.description ? ` | ${p.description}` : ''}`.trim())
      .filter(Boolean)
      .join('\n');

  const textToProjects = (text: string) =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, description] = line.split('|').map((v) => v.trim());
        return { name: name || '', description: description || '' };
      });

  useEffect(() => {
    let mounted = true;
    apiClient.get('/candidate/profile').then(res => {
      if (!mounted) return;
      if (res && res.profile) {
        setProfile(res.profile);
        const resolvedSkills = res.profile.technicalSkills || res.profile.skills || [];
        setSkillsInput(Array.isArray(resolvedSkills) ? resolvedSkills.join(', ') : '');
        setProjectsInput(projectsToText(res.profile.projects || []));
        setExtraInput(Array.isArray(res.profile.extraCurricular) ? res.profile.extraCurricular.join('\n') : '');
      }
      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const token = getAuthToken();
      if (!token) throw new Error('No auth token');

      const fd = new FormData();
      fd.append('resume', file);
      const apiBase = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '/api';
      const resp = await fetch(`${apiBase}/upload-resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await resp.json();
      if (data?.success && data?.candidate) {
        setProfile(data.candidate);
        const resolvedSkills = data.candidate.technicalSkills || data.candidate.skills || [];
        setSkillsInput(Array.isArray(resolvedSkills) ? resolvedSkills.join(', ') : '');
        setProjectsInput(projectsToText(data.candidate.projects || []));
        setExtraInput(Array.isArray(data.candidate.extraCurricular) ? data.candidate.extraCurricular.join('\n') : '');
        toast.success('Resume parsed with Gemini and profile saved');
      } else {
        throw new Error(data?.message || data?.error || 'Resume upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Resume parsing/upload failed. Please try another PDF.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.name?.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      const payload = {
        ...profile,
        projects: textToProjects(projectsInput),
        extraCurricular: extraInput.split('\n').map((s: string) => s.trim()).filter(Boolean),
        technicalSkills: skillsInput
          .split(',')
          .map((skill: string) => skill.trim())
          .filter(Boolean),
        skills: skillsInput
          .split(',')
          .map((skill: string) => skill.trim())
          .filter(Boolean)
      };

      const res = await apiClient.put('/candidate/profile', payload);
      if (res && res.profile) {
        toast.success('Profile saved');
        navigate('/candidate/dashboard');
      } else {
        toast.error('Save failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Complete Candidate Profile</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            This is the required step after sign up. Upload your resume to extract details automatically, or complete the profile manually.
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-dashed border-blue-300 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950/30">
          <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Upload Resume (PDF)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFile}
            className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-700 dark:text-gray-300"
          />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {uploading ? 'Extracting details from your resume...' : 'You can skip upload and enter everything manually below.'}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <input value={profile.name || ''} onChange={e=>setProfile({...profile, name:e.target.value})} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input value={profile.email || ''} readOnly className="w-full rounded-lg border bg-gray-100 px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
            <input value={profile.phone || ''} onChange={e=>setProfile({...profile, phone:e.target.value})} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">GitHub Profile URL</label>
            <input value={profile.githubUrl || ''} onChange={e=>setProfile({...profile, githubUrl:e.target.value})} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">LinkedIn Profile URL</label>
            <input value={profile.linkedinUrl || ''} onChange={e=>setProfile({...profile, linkedinUrl:e.target.value})} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Current Location</label>
            <input value={profile.location || ''} onChange={e=>setProfile({...profile, location:e.target.value})} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Professional Title</label>
            <input value={profile.title || ''} onChange={e=>setProfile({...profile, title:e.target.value})} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Technical Skills</label>
            <input value={skillsInput} onChange={e=>setSkillsInput(e.target.value)} placeholder="React, Node.js, Product Design" className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Projects (one per line: Name | 1-line description)</label>
            <textarea value={projectsInput} onChange={e=>setProjectsInput(e.target.value)} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" rows={4} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Extra Curricular (one per line)</label>
            <textarea value={extraInput} onChange={e=>setExtraInput(e.target.value)} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" rows={3} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Professional Summary</label>
            <textarea value={profile.summary || ''} onChange={e=>setProfile({...profile, summary:e.target.value})} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" rows={4} />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={handleSave} className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700">
            Save and Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidateCompleteProfile;
