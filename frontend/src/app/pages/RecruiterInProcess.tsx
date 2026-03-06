import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RecruiterHeader } from "../components/RecruiterHeader";
import { User, Mail, Calendar, Video, FileText, CheckCircle } from "lucide-react";
import { apiClient } from "../../utils/apiClient";
import { toast } from "sonner";

interface InProcessApplication {
  id: string;
  candidateId: string;
  jobId: string;
  status: string;
  appliedAt: string;
  candidate: {
    fullName: string;
    email: string;
    phone: string;
  };
  job: {
    title: string;
    company: string;
  };
  interviewLink?: string;
  interviewDate?: string | null;
  interviewType?: "phone" | "video" | "in-person";
  assessmentLink?: string;
  assessmentDueDate?: string | null;
  assessmentTitle?: string;
}

export function RecruiterInProcess() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<InProcessApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [interviewForm, setInterviewForm] = useState({
    date: "",
    time: "",
    type: "video" as "phone" | "video" | "in-person",
  });
  const [assessmentForm, setAssessmentForm] = useState({
    title: "",
    dueDate: "",
    link: "",
  });

  useEffect(() => {
    fetchInProcessApplications();
  }, []);

  const fetchInProcessApplications = async () => {
    try {
      const jobsData = await apiClient.get("/jobs/recruiter");

      if (Array.isArray(jobsData)) {
        const allInProcess: InProcessApplication[] = [];

        for (const rJob of jobsData) {
          try {
            const appsData = await apiClient.get(`/applications/job/${rJob.id || rJob._id}`);

            if (Array.isArray(appsData)) {
              const inProcessApps = appsData
                .filter((app: any) => {
                  const s = (app.status || "").toLowerCase();
                  return s === "in-process" || s === "in_process" || s === "in process";
                })
                .map((app: any) => ({
                  ...app,
                  candidate: app.candidate || { fullName: "Candidate", email: "", phone: "" },
                  job: {
                    title: rJob.title,
                    company: rJob.company,
                  },
                  jobId: rJob.id || rJob._id,
                }));

              allInProcess.push(...inProcessApps);
            }
          } catch (err) {
            console.error(`Error fetching applications for job ${rJob.id || rJob._id}:`, err);
          }
        }

        setApplications(allInProcess);
      }
    } catch (error) {
      console.error("Error fetching in-process applications:", error);
      toast.error("Failed to load in-process candidates");
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplication) return;

    try {
      const interviewDate = new Date(`${interviewForm.date}T${interviewForm.time}`);
      const result = await apiClient.put(`/applications/${selectedApplication}/status`, {
        status: "in-process",
        interviewDate: interviewDate.toISOString(),
        interviewType: interviewForm.type,
      });

      if (result.success) {
        if (result.calendarEventCreated && result.application?.interviewLink) {
          toast.success("Interview scheduled, Meet link generated, and reminder added to candidate Google Calendar.");
        } else if (result.calendarEventCreated) {
          toast.success("Interview scheduled and reminder added to candidate Google Calendar.");
        } else {
          toast.warning("Interview was saved, but not added to the candidate Google Calendar.");
        }
        if (result.reminderWarning) toast.warning(result.reminderWarning);
        setShowScheduleModal(false);
        setInterviewForm({ date: "", time: "", type: "video" });
        fetchInProcessApplications();
      } else {
        toast.error(result.error || "Failed to schedule interview");
      }
    } catch (error) {
      console.error("Error scheduling interview:", error);
      toast.error("Failed to schedule interview");
    }
  };

  const handleSendAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplication) return;

    try {
      const dueDate = new Date(`${assessmentForm.dueDate}T09:00:00`);
      const result = await apiClient.put(`/applications/${selectedApplication}/status`, {
        status: "in-process",
        assessmentTitle: assessmentForm.title,
        assessmentDueDate: dueDate.toISOString(),
        assessmentLink: assessmentForm.link,
      });

      if (result.success) {
        if (result.calendarEventCreated) {
          toast.success("Assessment sent and reminder added to candidate Google Calendar.");
        } else {
          toast.warning("Assessment was saved, but not added to the candidate Google Calendar.");
        }
        if (result.reminderWarning) toast.warning(result.reminderWarning);
        setShowAssessmentModal(false);
        setAssessmentForm({ title: "", dueDate: "", link: "" });
        fetchInProcessApplications();
      } else {
        toast.error(result.error || "Failed to send assessment");
      }
    } catch (error) {
      console.error("Error sending assessment:", error);
      toast.error("Failed to send assessment");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RecruiterHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            In-Process Candidates
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage interviews and assessments for shortlisted candidates
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : applications.length > 0 ? (
          <div className="space-y-6">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center text-white font-semibold text-lg">
                      {app.candidate.fullName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {app.candidate.fullName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {app.job.title} at {app.job.company}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {app.candidate.email}
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                    In Process
                  </span>
                </div>

                {app.interviewDate && (
                  <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Scheduled Interview
                    </h4>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-purple-900 dark:text-purple-300 font-medium">
                          {(app.interviewType || "video").charAt(0).toUpperCase() + (app.interviewType || "video").slice(1)} Interview
                        </span>
                        <span className="text-purple-700 dark:text-purple-400 ml-3">
                          {new Date(app.interviewDate).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {app.interviewLink && (
                          <a
                            href={app.interviewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-700 dark:text-purple-300 underline"
                          >
                            Open link
                          </a>
                        )}
                        <span className="px-2 py-1 rounded text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
                          scheduled
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {app.assessmentTitle && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Online Assessment
                    </h4>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-blue-900 dark:text-blue-300 font-medium">
                          {app.assessmentTitle}
                        </span>
                        <span className="text-blue-700 dark:text-blue-400 ml-3">
                          Due: {app.assessmentDueDate ? new Date(app.assessmentDueDate).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {app.assessmentLink && (
                          <a
                            href={app.assessmentLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 dark:text-blue-300 underline"
                          >
                            Open OA
                          </a>
                        )}
                        <span className="px-2 py-1 rounded text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
                          pending
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setSelectedApplication(app.id);
                      setShowScheduleModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                    Schedule Interview
                  </button>
                  <button
                    onClick={() => {
                      setSelectedApplication(app.id);
                      setShowAssessmentModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Send Assessment
                  </button>
                  <button
                    onClick={() => navigate(`/recruiter/send-offer/${app.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Send Offer Letter
                  </button>
                  <button
                    onClick={() => navigate(`/recruiter/messages?candidateId=${app.candidateId}`)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Message Candidate
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No candidates in process
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Move candidates to in-process from the applications page
            </p>
          </div>
        )}
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Schedule Interview
            </h3>
            <form onSubmit={handleScheduleInterview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interview Type
                </label>
                <select
                  value={interviewForm.type}
                  onChange={(e) => setInterviewForm({ ...interviewForm, type: e.target.value as "phone" | "video" | "in-person" })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="video">Video Call</option>
                  <option value="phone">Phone Call</option>
                  <option value="in-person">In-Person</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={interviewForm.date}
                  onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  required
                  value={interviewForm.time}
                  onChange={(e) => setInterviewForm({ ...interviewForm, time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Video interviews will generate a Google Meet link and add a reminder to the candidate's Google Calendar when their account is connected.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setInterviewForm({ date: "", time: "", type: "video" });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssessmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Send Online Assessment
            </h3>
            <form onSubmit={handleSendAssessment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assessment Title
                </label>
                <input
                  required
                  value={assessmentForm.title}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  required
                  value={assessmentForm.dueDate}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  OA Link
                </label>
                <input
                  type="url"
                  required
                  value={assessmentForm.link}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, link: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                The candidate will get a Google Calendar reminder containing the OA link when their account is connected.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssessmentModal(false);
                    setAssessmentForm({ title: "", dueDate: "", link: "" });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send OA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
