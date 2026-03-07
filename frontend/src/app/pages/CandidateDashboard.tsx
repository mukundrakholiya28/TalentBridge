import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "../components/DashboardHeader";
import { Search, MapPin, Briefcase, Building, DollarSign, Clock } from "lucide-react";
import { apiClient } from "../../utils/apiClient";
import { toast } from "sonner";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  posted?: string;
  createdAt?: string;
  description: string;
  logo?: string;
  recruiter?: { avatarUrl?: string; name?: string };
}

export function CandidateDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadJobs();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, locationQuery]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      if (searchQuery.trim() === "") {
        const data = await apiClient.get('/jobs');
        if (Array.isArray(data)) {
          let result = data;
          if (locationQuery.trim() !== "") {
            result = data.filter((j: any) => j.location.toLowerCase().includes(locationQuery.toLowerCase()));
          }
          setJobs(result.map((job: any) => ({ ...job, id: job._id || job.id })));
        } else {
          setJobs([]);
        }
      } else {
        const data = await apiClient.post('/jobs/semantic-search', {
          query: searchQuery,
          location: locationQuery
        });
        if (data && data.success && Array.isArray(data.results)) {
          setJobs(data.results.map((job: any) => ({ ...job, id: job._id || job.id })));
        } else {
          setJobs([]);
        }
      }
    } catch (error: any) {
      console.error("Error loading jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs; // Backend handles all filtering now

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Find Your Next Opportunity
          </h1>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Job title, keyword, or company"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="City, state, or zip code"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {filteredJobs.length} jobs found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Based on your profile and search criteria
          </p>
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => navigate(`/job/${job.id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer border border-gray-200 dark:border-gray-800"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {job.recruiter?.avatarUrl ? (
                        <img src={job.recruiter.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                      ) : (
                        <Building className="w-6 h-6 text-blue-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {job.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {job.company}
                      </p>

                      <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          <span>{job.type}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span>{job.salary}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(job.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                        {job.description}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/job/${job.id}/apply`);
                  }}
                  className="sm:ml-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap self-start sm:self-auto"
                >
                  Apply Now
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No jobs found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
}