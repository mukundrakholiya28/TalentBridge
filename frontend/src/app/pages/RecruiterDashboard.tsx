import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Users, FileText, TrendingUp, Plus, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { RecruiterHeader } from "../components/RecruiterHeader";
import { apiClient } from "../../utils/apiClient";
import { toast } from "sonner";

export function RecruiterDashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);

  useEffect(() => {
    fetchJobs();
    fetchRecentApplications();
  }, []);

  const fetchJobs = async () => {
    try {
      const data = await apiClient.get('/jobs/recruiter');
      if (Array.isArray(data)) {
        setJobs(data);
      }
    } catch (error) {
      console.error("Failed to fetch jobs data:", error);
    }
  };

  const fetchRecentApplications = async () => {
    try {
      const data = await apiClient.get('/applications/recruiter');
      if (Array.isArray(data)) {
        setRecentApplications(data);
      }
    } catch (error) {
      console.error("Failed to fetch recent applications:", error);
    }
  };

  const updateAppStatus = async (appId: string, status: string) => {
    try {
      const result = await apiClient.put(`/applications/${appId}/status`, { status });
      if (result.success) {
        toast.success(`Application ${status === 'rejected' ? 'rejected' : 'moved to ' + status}`);
        fetchRecentApplications();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update status');
    }
  };

  const stats = [
    { label: "Active Jobs", value: jobs.length.toString(), icon: Briefcase, color: "text-blue-600" },
    { label: "Total Applicants", value: recentApplications.length.toString(), icon: Users, color: "text-green-600" },
    { label: "Interviews Scheduled", value: recentApplications.filter(app => app.status === 'Interview Scheduled').length.toString(), icon: FileText, color: "text-purple-600" },
    { label: "Offers Sent", value: recentApplications.filter(app => app.status === 'Offer Extended').length.toString(), icon: TrendingUp, color: "text-orange-600" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RecruiterHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome Back, Recruiter
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your job postings and candidates
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div
            onClick={() => navigate("/recruiter/jobs")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {jobs.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Active Jobs
            </p>
          </div>
          <div
            onClick={() => navigate("/recruiter/applications")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {recentApplications.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Applicants
            </p>
          </div>
          <div
            onClick={() => navigate("/recruiter/applications")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {recentApplications.filter(app => app.status === 'Interview Scheduled').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Interviews Scheduled
            </p>
          </div>
          <div
            onClick={() => navigate("/recruiter/offers")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {recentApplications.filter(app => app.status === 'Offer Extended').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Offers Sent
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate("/recruiter/post-job")}
              className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Post New Job</span>
            </button>
            <button
              onClick={() => navigate("/recruiter/jobs")}
              className="flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <Users className="w-5 h-5" />
              <span>View My Jobs</span>
            </button>
            <button
              onClick={() => navigate("/recruiter/applications")}
              className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span>Manage Interviews</span>
            </button>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Applications
          </h2>
          <div className="space-y-4">
            {recentApplications.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {app.candidateName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {app.position}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Applied: {app.appliedDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                    {app.status}
                  </span>
                  {(app.status === 'Pending' || app.status === 'pending') && (
                    <>
                      <button
                        onClick={() => updateAppStatus(app.id, 'in-process')}
                        title="Accept & Move to In-Process"
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateAppStatus(app.id, 'rejected')}
                        title="Reject"
                        className="p-2 border border-red-300 dark:border-red-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {app.status === 'in-process' && (
                    <button
                      onClick={() => navigate(`/recruiter/send-offer/${app.id}`)}
                      title="Send Offer Letter"
                      className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/recruiter/applications")}
                    title="View Details"
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}