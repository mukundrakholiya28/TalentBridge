import { useState, useEffect } from "react";
import { DashboardHeader } from "../components/DashboardHeader";
import {
  Building, Calendar, Video, FileText, CheckCircle,
  Clock, MessageSquare, ExternalLink, ClipboardList
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../utils/apiClient";

interface InProcessApp {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  status: string;
  appliedAt: string;
  recruiterId: string;
  recruiterName: string;
  interviewLink: string;
  interviewDate: string | null;
  interviewType: string;
  assessmentLink: string;
  assessmentDueDate: string | null;
  assessmentTitle: string;
}

export function InProcess() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<InProcessApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInProcessApplications();
  }, []);

  const fetchInProcessApplications = async () => {
    try {
      const appsData = await apiClient.get('/applications/my-applications');
      if (Array.isArray(appsData)) {
        const inProcess = appsData.filter((app: any) => {
          const s = (app.status || '').toLowerCase();
          return s === 'in-process' || s === 'in_process' || s === 'in-review' || s === 'in review';
        });
        setApplications(inProcess);
      }
    } catch (error) {
      console.error("Failed to fetch in-process applications:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            In Process
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your ongoing interview processes and assessments
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : applications.length > 0 ? (
          <div className="space-y-5">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {app.jobTitle}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                          {app.company}
                          {app.location && ` · ${app.location}`}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold border border-blue-300 dark:border-blue-700">
                      In Process
                    </span>
                  </div>

                  {/* Progress Steps */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between">
                      {["Applied", "In Review", "Interview", "Offer"].map((label, i) => {
                        const completed = i <= 1; // In-process = step 1 completed
                        const current = i === 2; // Interview is next
                        return (
                          <div key={label} className="flex items-center flex-1">
                            <div className="flex flex-col items-center">
                              {completed ? (
                                <CheckCircle className="w-7 h-7 text-green-500" />
                              ) : current ? (
                                <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">{i + 1}</span>
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">{i + 1}</span>
                                </div>
                              )}
                              <span className={`text-xs mt-1.5 font-medium ${completed ? 'text-green-600 dark:text-green-400' : current ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                {label}
                              </span>
                            </div>
                            {i < 3 && (
                              <div className={`flex-1 h-0.5 mx-2 rounded ${completed ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-600'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interview & Assessment Cards */}
                  <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    {/* Interview */}
                    {app.interviewLink ? (
                      <a
                        href={app.interviewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800 hover:border-purple-400 transition-all group"
                      >
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                          <Video className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1">
                            Join Interview <ExternalLink className="w-3 h-3" />
                          </p>
                          <p className="text-xs text-purple-600 dark:text-purple-400 truncate">
                            {app.interviewDate
                              ? new Date(app.interviewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : `${app.interviewType || 'video'} call`}
                          </p>
                        </div>
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 opacity-60">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                          <Video className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Interview</p>
                          <p className="text-xs text-gray-400">Not scheduled yet</p>
                        </div>
                      </div>
                    )}

                    {/* Assessment */}
                    {app.assessmentLink ? (
                      <a
                        href={app.assessmentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800 hover:border-orange-400 transition-all group"
                      >
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 transition-colors">
                          <ClipboardList className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-orange-900 dark:text-orange-300 flex items-center gap-1">
                            Take Assessment <ExternalLink className="w-3 h-3" />
                          </p>
                          <p className="text-xs text-orange-600 dark:text-orange-400 truncate">
                            {app.assessmentTitle || 'Online Assessment'}
                            {app.assessmentDueDate && ` · Due ${new Date(app.assessmentDueDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 opacity-60">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                          <ClipboardList className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Assessment</p>
                          <p className="text-xs text-gray-400">No OA assigned yet</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => navigate(`/candidate/messages?to=${app.recruiterId}`)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message Recruiter
                    </button>
                    <button
                      onClick={() => navigate(`/job/${app.jobId}`)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      View Job
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Active Processes
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Applications that move forward will appear here
            </p>
            <button
              onClick={() => navigate("/candidate/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Browse Jobs
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
