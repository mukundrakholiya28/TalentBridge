import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardHeader } from "../components/DashboardHeader";
import {
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Building,
  CheckCircle
} from "lucide-react";
import { apiClient } from "../../utils/apiClient";

export function JobDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      const data = await apiClient.get('/jobs');
      if (Array.isArray(data)) {
        const foundJob = data.find((j: any) => j._id === id || j.id === id);
        if (foundJob) {
          setJob({
            ...foundJob,
            id: foundJob._id || foundJob.id
          });
        }
      }
    } catch (error) {
      console.error("Error fetching job details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Job Not Found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">The position you are looking for has been closed or does not exist.</p>
        <button onClick={() => navigate("/candidate/dashboard")} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Back to Jobs
        </button>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/candidate/dashboard")}
          className="mb-6 text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          ← Back to Jobs
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building className="w-8 h-8 text-blue-600" />
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {job.title}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                {job.company}
              </p>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Briefcase className="w-4 h-4" />
                  <span>{job.type}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <DollarSign className="w-4 h-4" />
                  <span>{job.salary}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Posted {new Date(job.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/job/${job.id}/apply`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Apply Now
            </button>
          </div>

          {/* Job Description */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Job Description
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {job.description}
            </p>
          </div>

          {/* Requirements */}
          {job.requirements && Array.isArray(job.requirements) && job.requirements.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Requirements
              </h2>
              <ul className="space-y-2">
                {job.requirements.map((req: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{req.trim()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Responsibilities */}
          {job.responsibilities && Array.isArray(job.responsibilities) && job.responsibilities.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Responsibilities
              </h2>
              <ul className="space-y-2">
                {job.responsibilities.map((resp: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>{resp.trim()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Benefits */}
          {job.benefits && Array.isArray(job.benefits) && job.benefits.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Benefits
              </h2>
              <ul className="space-y-2">
                {job.benefits.map((benefit: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>{benefit.trim()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* About Company */}
          {job.aboutCompany && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                About {job.company}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {job.aboutCompany}
              </p>
            </div>
          )}

          {/* Apply Button */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => navigate(`/job/${job.id}/apply`)}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Apply for this Position
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
