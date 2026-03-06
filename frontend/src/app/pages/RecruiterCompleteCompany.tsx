import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../utils/apiClient';
import { toast } from 'sonner';

export const RecruiterCompleteCompany: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>({ name: '', email: '', companyName: '', companyDescription: '', phone: '', website: '', location: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiClient.get('/recruiter/profile').then(res => {
      if (!mounted) return;
      if (res && res.profile) setProfile(res.profile);
      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleSave = async () => {
    if (!profile.companyName?.trim() || !profile.companyDescription?.trim()) {
      toast.error('Company name and company description are required');
      return;
    }

    try {
      const res = await apiClient.put('/recruiter/profile', profile);
      if (res && res.profile) {
        toast.success('Company details saved');
        navigate('/recruiter/dashboard');
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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Complete Company Profile</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            This is the required step after recruiter sign up. Add your firm details before entering the recruiter dashboard.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Recruiter Name</label>
            <input value={profile.name || ''} readOnly className="w-full rounded-lg border bg-gray-100 px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input value={profile.email || ''} readOnly className="w-full rounded-lg border bg-gray-100 px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label>
            <input value={profile.companyName || ''} onChange={e=>setProfile({...profile, companyName:e.target.value})} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Company Description</label>
            <textarea value={profile.companyDescription || ''} onChange={e=>setProfile({...profile, companyDescription:e.target.value})} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" rows={4} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
            <input value={profile.phone || ''} onChange={e=>setProfile({...profile, phone:e.target.value})} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Website</label>
            <input value={profile.website || ''} onChange={e=>setProfile({...profile, website:e.target.value})} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Company Location</label>
            <input value={profile.location || ''} onChange={e=>setProfile({...profile, location:e.target.value})} className="w-full rounded-lg border px-3 py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={handleSave} className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700">Save and Continue</button>
        </div>
      </div>
    </div>
  );
};

export default RecruiterCompleteCompany;
