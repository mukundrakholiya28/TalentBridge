import { useState, useEffect } from "react";
import { DashboardHeader } from "../components/DashboardHeader";
import {
  Building, MapPin, Clock, FileText, Eye, MessageSquare,
  Video, ClipboardList, CheckCircle, XCircle, Circle,
  ArrowRight, ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../utils/apiClient";

interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  appliedAt: string;
  status: string;
  recruiterId: string;
  recruiterName: string;
  interviewLink: string;
  interviewDate: string | null;
  interviewType: string;
  assessmentLink: string;
  assessmentDueDate: string | null;
  assessmentTitle: string;
  statusHistory?: Array<{
    from?: string;
    to?: string;
    changedAt?: string;
    note?: string;
    changedBy?: string;
  }>;
}

const STATUS_FLOW = ["Pending", "in-process", "Offer Extended", "Offer Accepted"];

export function MyApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  useEffect(() => {
    fetchMyApplications();
  }, []);

  const fetchMyApplications = async () => {
    try {
      const appsData = await apiClient.get('/applications/my-applications');
      if (Array.isArray(appsData)) {
        setApplications(appsData);
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeStatus = (status: string) => {
    return status?.toLowerCase().replace(/[\s_]+/g, '-') || 'pending';
  };

  const getStatusColor = (status: string) => {
    const s = normalizeStatus(status);
    if (s === 'pending') return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
    if (s === 'in-process' || s === 'in-review') return "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700";
    if (s === 'offer-extended') return "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700";
    if (s === 'offer-accepted' || s === 'selected') return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700";
    if (s === 'rejected' || s === 'offer-declined') return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700";
    return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600";
  };

  const getStatusText = (status: string) => {
    const s = normalizeStatus(status);
    if (s === 'pending') return "Application Sent";
    if (s === 'in-process' || s === 'in-review') return "In Review";
    if (s === 'offer-extended') return "Offer Received";
    if (s === 'offer-accepted' || s === 'selected') return "Accepted 🎉";
    if (s === 'offer-declined') return "Offer Declined";
    if (s === 'rejected') return "Not Selected";
    return status;
  };

  const getStepIndex = (status: string) => {
    const s = normalizeStatus(status);
    if (s === 'pending') return 0;
    if (s === 'in-process' || s === 'in-review') return 1;
    if (s === 'offer-extended') return 2;
    if (s === 'offer-accepted' || s === 'selected') return 3;
    return -1; // rejected
  };

  const isRejected = (status: string) => {
    const s = normalizeStatus(status);
    return s === 'rejected' || s === 'offer-declined';
  };

  const displayStatus = (value: string) => {
    const s = String(value || "").toLowerCase();
    if (s === "in-process") return "In Process";
    if (s === "offer-extended") return "Offer Extended";
    if (s === "offer-accepted") return "Offer Accepted";
    if (s === "offer-declined") return "Offer Declined";
    if (s === "pending") return "Pending";
    return value || "Status Updated";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Applications
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track the status of all your job applications
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : applications.length > 0 ? (
          <div className="space-y-5">
            {applications.map((app) => {
              const stepIdx = getStepIndex(app.status);
              const rejected = isRejected(app.status);
              const expanded = expandedApp === app.id;

              return (
                <div
                  key={app.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Main Row */}
                  <div
                    className="p-6 cursor-pointer"
                    onClick={() => setExpandedApp(expanded ? null : app.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building className="w-6 h-6 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                            {app.jobTitle}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                            {app.company}
                          </p>

                          <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                            {app.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{app.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(app.status)}`}>
                          {getStatusText(app.status)}
                        </span>
                        <ArrowRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {expanded && (
                    <div className="border-t border-gray-200 dark:border-gray-800 p-6 bg-gray-50 dark:bg-gray-800/50 space-y-6 animate-in">

                      {/* Status Progress Tracker */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
                          Application Progress
                        </h4>
                        {rejected ? (
                          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                            <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                {app.status === 'Offer Declined' ? 'Offer Declined' : 'Application Not Selected'}
                              </p>
                              <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                                Thank you for applying. Keep looking for opportunities!
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            {["Applied", "In Review", "Offer", "Accepted"].map((label, i) => (
                              <div key={label} className="flex items-center flex-1">
                                <div className="flex flex-col items-center">
                                  {i <= stepIdx ? (
                                    <CheckCircle className={`w-7 h-7 ${i <= stepIdx ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`} />
                                  ) : (
                                    <Circle className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                                  )}
                                  <span className={`text-xs mt-1.5 font-medium ${i <= stepIdx ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {label}
                                  </span>
                                </div>
                                {i < 3 && (
                                  <div className={`flex-1 h-0.5 mx-2 rounded ${i < stepIdx ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-600'}`} />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Cards */}
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">

                        {/* Message Recruiter */}
                        <button
                          onClick={() => navigate(`/candidate/messages?to=${app.recruiterId}`)}
                          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all text-left group"
                        >
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                            <MessageSquare className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Message</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Chat with recruiter</p>
                          </div>
                        </button>

                        {/* Interview Link */}
                        {app.interviewLink ? (
                          <a
                            href={app.interviewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-sm transition-all text-left group"
                          >
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                              <Video className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                                Interview <ExternalLink className="w-3 h-3" />
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {app.interviewDate
                                  ? new Date(app.interviewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                  : `${app.interviewType || 'video'} call`}
                              </p>
                            </div>
                          </a>
                        ) : (
                          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 opacity-60">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Video className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Interview</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">Not scheduled yet</p>
                            </div>
                          </div>
                        )}

                        {/* Assessment/OA Link */}
                        {app.assessmentLink ? (
                          <a
                            href={app.assessmentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-sm transition-all text-left group"
                          >
                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                              <ClipboardList className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                                Assessment <ExternalLink className="w-3 h-3" />
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {app.assessmentTitle || 'Online Assessment'}
                                {app.assessmentDueDate && ` · Due ${new Date(app.assessmentDueDate).toLocaleDateString()}`}
                              </p>
                            </div>
                          </a>
                        ) : (
                          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 opacity-60">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <ClipboardList className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Assessment</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">No OA assigned yet</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* View Job Details */}
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => navigate(`/job/${app.jobId}`)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View Job Details
                        </button>
                      </div>

                      {/* Status Timeline */}
                      <div className="pt-2">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                          Status Timeline
                        </h4>
                        {Array.isArray(app.statusHistory) && app.statusHistory.length > 0 ? (
                          <div className="space-y-2">
                            {app.statusHistory
                              .slice()
                              .sort((a, b) =>
                                new Date(a.changedAt || 0).getTime() - new Date(b.changedAt || 0).getTime()
                              )
                              .map((item, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-sm">
                                  <div className="mt-1 w-2 h-2 rounded-full bg-blue-500" />
                                  <div>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                      {displayStatus(item.to || "")}
                                      {item.from ? ` (from ${displayStatus(item.from)})` : ""}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {item.changedAt ? new Date(item.changedAt).toLocaleString() : ""}
                                      {item.note ? ` · ${item.note}` : ""}
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            No status transitions recorded yet.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Applications Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start applying to jobs to see them here
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
