import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { RecruiterHeader } from "../components/RecruiterHeader";
import { Plus, Users, MapPin, Briefcase, Eye, Edit, Trash2 } from "lucide-react";
import { apiClient } from "../../utils/apiClient";
import { toast } from "sonner";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  applicants: string[];
  status: string;
  createdAt: string;
}

export function RecruiterJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const data = await apiClient.get('/jobs/recruiter');

      // Handle both plain array and wrapped { jobs: [] } response shapes
      const jobList = Array.isArray(data) ? data : (data?.jobs || []);
      const mappedJobs = jobList.map((job: any) => ({
        ...job,
        id: job.id || job._id // prefer UUID `id` for delete, fallback to _id
      }));
      setJobs(mappedJobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;

    try {
      const result = await apiClient.delete(`/jobs/${jobId}`);

      if (result.success) {
        toast.success("Job deleted successfully");
        fetchJobs();
      } else {
        toast.error(result.error || "Failed to delete job");
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Failed to delete job");
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300",
      closed: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300",
      draft: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RecruiterHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              My Jobs
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage all your job postings
            </p>
          </div>
          <button
            onClick={() => navigate("/recruiter/post-job")}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Post New Job
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {job.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {job.company}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(job.status)}`}>
                    {job.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 mr-2" />
                    {job.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Briefcase className="w-4 h-4 mr-2" />
                    {job.type}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4 mr-2" />
                    {job.applicants?.length || 0} Applicants
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/recruiter/jobs/${job.id}/applications`)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Applications
                  </button>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No jobs posted yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start by posting your first job to attract candidates
            </p>
            <button
              onClick={() => navigate("/recruiter/post-job")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              Post Your First Job
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
