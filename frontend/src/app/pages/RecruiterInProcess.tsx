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
  interviews?: Interview[];
  assessments?: Assessment[];
}

interface Interview {
  id: string;
  date: string;
  time: string;
  type: 'phone' | 'video' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface Assessment {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'evaluated';
  score?: number;
}

export function RecruiterInProcess() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<InProcessApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [interviewForm, setInterviewForm] = useState({
    date: '',
    time: '',
    type: 'video' as 'phone' | 'video' | 'in-person',
  });

  useEffect(() => {
    fetchInProcessApplications();
  }, []);

  const fetchInProcessApplications = async () => {
    try {
      // Fetch all jobs for this recruiter first to use as a lookup
      const jobsData = await apiClient.get('/jobs/recruiter');

      if (Array.isArray(jobsData)) {
        const allInProcess: InProcessApplication[] = [];

        // For each job, fetch applications
        for (const rJob of jobsData) {
          try {
            const appsData = await apiClient.get(`/applications/job/${rJob.id || rJob._id}`);

            if (Array.isArray(appsData)) {
              const inProcessApps = appsData
                .filter((app: any) => {
                  const s = (app.status || '').toLowerCase();
                  return s === 'in-process' || s === 'in_process' || s === 'in process';
                })
                .map((app: any) => ({
                  ...app,
                  candidate: app.candidate || { fullName: 'Candidate', email: '', phone: '' },
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

    try {
      const result = await apiClient.post('/interviews', {
        applicationId: selectedApplication,
        ...interviewForm,
        status: 'scheduled',
      });

      if (result.success || result._id || result.id) {
        toast.success("Interview scheduled successfully!");
        setShowScheduleModal(false);
        setInterviewForm({ date: '', time: '', type: 'video' });
        fetchInProcessApplications();
      } else {
        toast.error(result.error || "Failed to schedule interview");
      }
    } catch (error) {
      console.error("Error scheduling interview:", error);
      toast.error("Failed to schedule interview");
    }
  };

  const handleSendAssessment = async (applicationId: string) => {
    const title = prompt("Enter assessment title:");
    if (!title) return;

    const dueDate = prompt("Enter due date (YYYY-MM-DD):");
    if (!dueDate) return;

    try {
      const result = await apiClient.post('/assessments', {
        applicationId,
        title,
        dueDate,
        status: 'pending',
      });

      if (result.success || result._id || result.id) {
        toast.success("Assessment sent successfully!");
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

                {/* Interviews */}
                {app.interviews && app.interviews.length > 0 && (
                  <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Scheduled Interviews
                    </h4>
                    <div className="space-y-2">
                      {app.interviews.map((interview) => (
                        <div key={interview.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-purple-900 dark:text-purple-300 font-medium">
                              {interview.type.charAt(0).toUpperCase() + interview.type.slice(1)} Interview
                            </span>
                            <span className="text-purple-700 dark:text-purple-400 ml-3">
                              {interview.date} at {interview.time}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${interview.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                            }`}>
                            {interview.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assessments */}
                {app.assessments && app.assessments.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Online Assessments
                    </h4>
                    <div className="space-y-2">
                      {app.assessments.map((assessment) => (
                        <div key={assessment.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-blue-900 dark:text-blue-300 font-medium">
                              {assessment.title}
                            </span>
                            <span className="text-blue-700 dark:text-blue-400 ml-3">
                              Due: {assessment.dueDate}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {assessment.score && (
                              <span className="text-blue-900 dark:text-blue-300 font-semibold">
                                Score: {assessment.score}%
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded text-xs ${assessment.status === 'evaluated'
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                              : assessment.status === 'submitted'
                                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                              }`}>
                              {assessment.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
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
                    onClick={() => handleSendAssessment(app.id)}
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

      {/* Schedule Interview Modal */}
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
                  onChange={(e) => setInterviewForm({ ...interviewForm, type: e.target.value as any })}
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

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setInterviewForm({ date: '', time: '', type: 'video' });
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
    </div>
  );
}
