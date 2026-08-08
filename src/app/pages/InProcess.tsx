import { useState, useEffect } from "react";
import { DashboardHeader } from "../components/DashboardHeader";
import {
  Building, Calendar, Video, FileText, CheckCircle,
  Clock, MessageSquare, ExternalLink, ClipboardList, Handshake, Mail
} from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
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
          const s = (app.status || '').toLowerCase().replace(/[\s_-]+/g, ' ').trim();
          // Show everything except terminal states and initial pending
          const terminalStatuses = ['pending', 'rejected', 'offer accepted', 'offer declined'];
          return !terminalStatuses.includes(s);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
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
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
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
                    {(() => {
                      const s = (app.status || '').toLowerCase().replace(/[\s_-]+/g, ' ').trim();
                      const label =
                        s === 'in process' || s === 'in review' ? 'In Review' :
                        s === 'assessment completed' ? 'Assessment Completed' :
                        s === 'interview scheduled' ? 'Interview Scheduled' :
                        s === 'offer extended' ? 'Offer Extended' :
                        s === 'negotiating' ? 'Negotiating' :
                        app.status || 'In Process';
                      const colors =
                        s === 'offer extended' || s === 'negotiating'
                          ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                          : s === 'assessment completed'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
                          : s === 'interview scheduled'
                          ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                          : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700';
                      return (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors}`}>
                          {label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Progress Steps */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between">
                      {(() => {
                        const steps = ["Applied", "In Review", "Assessment", "Interview", "Offer"];
                        const s = (app.status || '').toLowerCase().replace(/[\s_-]+/g, ' ').trim();
                        const stepIndex =
                          s === 'offer extended' || s === 'negotiating' ? 4 :
                          s === 'interview scheduled' ? 3 :
                          s === 'assessment completed' ? 2 :
                          s === 'in process' || s === 'in review' ? 1 :
                          0;
                        return steps.map((label, i) => {
                          const completed = i <= stepIndex;
                          const current = i === stepIndex;
                          return (
                            <div key={label} className="flex items-center flex-1">
                              <div className="flex flex-col items-center">
                                {completed && !current ? (
                                  <CheckCircle className="w-7 h-7 text-green-500" />
                                ) : current ? (
                                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-blue-200 dark:ring-blue-800">
                                    <span className="text-white text-xs font-bold">{i + 1}</span>
                                  </div>
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">{i + 1}</span>
                                  </div>
                                )}
                                <span className={`text-xs mt-1.5 font-medium ${completed && !current ? 'text-green-600 dark:text-green-400' : current ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                  {label}
                                </span>
                              </div>
                              {i < steps.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 rounded ${completed && !current ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-600'}`} />
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Interview & Assessment & Offer Cards */}
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
                      <button
                        onClick={() => navigate(app.assessmentLink)}
                        className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800 hover:border-orange-400 transition-all group text-left"
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
                      </button>
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

                  {/* Offer Card (when offer has been extended or is being negotiated) */}
                  {(() => {
                    const s = (app.status || '').toLowerCase().replace(/[\s_-]+/g, ' ').trim();
                    if (s === 'offer extended' || s === 'negotiating') {
                      return (
                        <div className="mb-4">
                          <button
                            onClick={() => navigate('/candidate/offers')}
                            className="w-full flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800 hover:border-amber-400 transition-all group"
                          >
                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                              {s === 'negotiating' ? <Handshake className="w-5 h-5 text-amber-600" /> : <Mail className="w-5 h-5 text-amber-600" />}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                                {s === 'negotiating' ? 'Offer Under Negotiation' : 'Offer Letter Received'}
                                <ExternalLink className="w-3 h-3" />
                              </p>
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                {s === 'negotiating' ? 'Your counter-offer has been sent — awaiting recruiter response' : 'Review and respond to your offer letter'}
                              </p>
                            </div>
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => navigate(`/candidate/messages?to=${app.recruiterId}`)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message Recruiter
                    </button>
                    <button
                      onClick={() => navigate(`/job/${app.jobId}`)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
