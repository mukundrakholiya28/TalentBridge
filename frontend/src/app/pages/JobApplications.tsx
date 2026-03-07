import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RecruiterHeader } from "../components/RecruiterHeader";
import { Star, User, Mail, Phone, FileText, ArrowUpDown, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { apiClient } from "../../utils/apiClient";
import { toast } from "sonner";

interface Application {
  id: string;
  candidateId: string;
  status: string;
  appliedAt: string;
  coverLetter: string;
  candidate: {
    fullName: string;
    email: string;
    phone: string;
    profile?: {
      skills?: string[];
      experience?: string;
      education?: string;
    };
  };
  matchScore?: number;
  jobTitle?: string;
  auditLog?: { status: string; timestamp: string }[];
  createdAt?: string;
}

interface Job {
  id: string;
  title: string;
  company: string;
  skills?: string[];
  requirements?: string[];
}

interface AtsCandidate {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  skills?: string[];
  location?: string;
  summary?: string;
  score: number;
}

export function JobApplications() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'match'>('match');
  const [searchTerm, setSearchTerm] = useState('');
  const [atsQuery, setAtsQuery] = useState('');
  const [atsSkills, setAtsSkills] = useState('');
  const [atsLocation, setAtsLocation] = useState('');
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsResults, setAtsResults] = useState<AtsCandidate[]>([]);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);

  useEffect(() => {
    fetchJobAndApplications();
  }, [jobId]);

  const calculateMatchScore = (application: Application, job: Job): number => {
    let score = 0;
    const profile = application.candidate.profile;

    if (!profile) return 0;

    // Match skills
    const candidateSkills = (profile.skills || []).map(s => s.toLowerCase());
    const requiredSkills = (job.skills || []).map(s => s.toLowerCase());

    requiredSkills.forEach(skill => {
      if (candidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))) {
        score += 20;
      }
    });

    // Match requirements
    const requirements = (job.requirements || []).join(' ').toLowerCase();
    const candidateExp = (profile.experience || '').toLowerCase();
    const candidateEdu = (profile.education || '').toLowerCase();

    if (requirements.includes('bachelor') && candidateEdu.includes('bachelor')) score += 15;
    if (requirements.includes('master') && candidateEdu.includes('master')) score += 20;

    // Experience level matching
    const expMatch = candidateExp.match(/(\d+)/);
    if (expMatch) {
      const years = parseInt(expMatch[0]);
      if (years >= 5) score += 15;
      else if (years >= 3) score += 10;
      else if (years >= 1) score += 5;
    }

    return Math.min(score, 100);
  };

  const fetchJobAndApplications = async () => {
    try {
      if (jobId) {
        // Fetch job details first to get the skills/requirements context for matching
        const jobData = await apiClient.get('/jobs/recruiter');
        const currentJob = jobData.find((j: any) => j._id === jobId || j.id === jobId);

        if (currentJob) {
          setJob(currentJob);

          // Fetch applications for this specific job
          const appsData = await apiClient.get(`/applications/job/${jobId}`);

          if (Array.isArray(appsData)) {
            const appsWithScores = appsData.map((app: any) => ({
              ...app,
              candidate: app.candidate || { fullName: 'Candidate', email: '', phone: '' }, // Fallbacks needed if User auth model doesn't embed this initially
              matchScore: app.candidate ? calculateMatchScore(app, currentJob) : 0,
            }));
            setApplications(appsWithScores);
          }
        }
      } else {
        // If no jobId passed, load ALL applications for ALL of this recruiter's jobs
        const jobsData = await apiClient.get('/jobs/recruiter');

        if (Array.isArray(jobsData)) {
          let allApps: any[] = [];

          for (const rJob of jobsData) {
            try {
              const appsData = await apiClient.get(`/applications/job/${rJob.id || rJob._id}`);

              if (Array.isArray(appsData)) {
                const appsWithScores = appsData.map((app: any) => ({
                  ...app,
                  candidate: app.candidate || { fullName: 'Candidate', email: '', phone: '' },
                  matchScore: app.candidate ? calculateMatchScore(app, rJob) : 0,
                  jobTitle: rJob.title
                }));
                allApps = [...allApps, ...appsWithScores];
              }
            } catch (err) {
              console.error(`Error fetching applications for job ${rJob.id || rJob._id}:`, err);
            }
          }
          setApplications(allApps);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const result = await apiClient.put(`/applications/${applicationId}/status`, { status: newStatus });

      if (result.success) {
        toast.success(`Application ${newStatus}`);
        fetchJobAndApplications();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const toggleSelectApplication = (applicationId: string, checked: boolean) => {
    setSelectedApplicationIds((prev) => {
      if (checked) return [...new Set([...prev, applicationId])];
      return prev.filter((id) => id !== applicationId);
    });
  };

  const bulkMoveToInProcess = async () => {
    if (selectedApplicationIds.length === 0) {
      toast.error("Select at least one application");
      return;
    }
    try {
      const result = await apiClient.put("/applications/bulk/status", {
        ids: selectedApplicationIds,
        status: "in-process"
      });
      if (result?.success) {
        toast.success(`Moved ${result.updatedCount || 0} candidate(s) to in-process`);
        setSelectedApplicationIds([]);
        fetchJobAndApplications();
      } else {
        toast.error(result?.message || "Bulk update failed");
      }
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error("Failed to move selected candidates");
    }
  };

  const runAtsSearch = async () => {
    if (!atsQuery.trim()) {
      toast.error("Enter a search query for ATS candidate discovery");
      return;
    }
    setAtsLoading(true);
    try {
      const skills = atsSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const data = await apiClient.post("/ats/hybrid-search", {
        query: atsQuery.trim(),
        skills,
        location: atsLocation.trim()
      });
      if (data?.success && Array.isArray(data.results)) {
        setAtsResults(data.results);
      } else {
        setAtsResults([]);
      }
    } catch (error) {
      console.error("ATS search error:", error);
      toast.error("Failed to run ATS candidate search");
      setAtsResults([]);
    } finally {
      setAtsLoading(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const candidateName = app.candidate.fullName.toLowerCase();
    const skills = (app.candidate.profile?.skills || []).join(' ').toLowerCase();
    return candidateName.includes(searchLower) || skills.includes(searchLower) || app.candidate.email.toLowerCase().includes(searchLower);
  });

  const sortedApplications = [...filteredApplications].sort((a, b) => {
    if (sortBy === 'match') {
      return (b.matchScore || 0) - (a.matchScore || 0);
    } else {
      return new Date(b.appliedAt || b.createdAt || Date.now()).getTime() - new Date(a.appliedAt || a.createdAt || Date.now()).getTime();
    }
  });

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300';
      case 'in-process': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
      case 'accepted': return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'rejected': return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RecruiterHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate("/recruiter/jobs")}
            className="text-blue-600 hover:underline mb-4"
          >
            ← Back to My Jobs
          </button>
          {job ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {job.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {job.company} • {applications.length} Applications
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                All Applications
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {applications.length} Total Applications
              </p>
            </>
          )}
        </div>

        {/* ATS Controls & Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-1/2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search candidates by name, email, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="text-gray-600 dark:text-gray-400 text-sm">
                <span className="font-semibold text-gray-900 dark:text-white mr-2">ATS Powered</span>
                Applications auto-sorted by match score
              </div>
              <button
                onClick={() => setSortBy(sortBy === 'match' ? 'date' : 'match')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all whitespace-nowrap"
              >
                <ArrowUpDown className="w-4 h-4" />
                Sort: {sortBy === 'match' ? 'Match Score' : 'Date Applied'}
              </button>
            </div>
          </div>
        </div>

        {/* Recruiter Candidate Discovery (Keyword + Filters) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Candidate Discovery (Semantic + Filters)
          </h3>
          <div className="grid md:grid-cols-4 gap-3">
            <input
              value={atsQuery}
              onChange={(e) => setAtsQuery(e.target.value)}
              placeholder="e.g. backend ML engineer with Python"
              className="md:col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              value={atsSkills}
              onChange={(e) => setAtsSkills(e.target.value)}
              placeholder="skills filter: Python, Node.js"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              value={atsLocation}
              onChange={(e) => setAtsLocation(e.target.value)}
              placeholder="location filter"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="mt-3">
            <button
              onClick={runAtsSearch}
              disabled={atsLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70"
            >
              {atsLoading ? "Searching..." : "Find Candidates"}
            </button>
          </div>

          {atsResults.length > 0 && (
            <div className="mt-4 space-y-3">
              {atsResults.map((c) => (
                <div key={c._id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-700/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{c.name || "Candidate"}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{c.email}</p>
                      {c.location && <p className="text-xs text-gray-500 dark:text-gray-500">Location: {c.location}</p>}
                      {Array.isArray(c.skills) && c.skills.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Skills: {c.skills.slice(0, 8).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        Match {(Number(c.score || 0) * 100).toFixed(1)}%
                      </p>
                      {c.userId && (
                        <button
                          onClick={() => navigate(`/candidate/profile?id=${c.userId}`)}
                          className="mt-2 px-3 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          View Profile
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : sortedApplications.length > 0 ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Selected: <span className="font-semibold text-gray-900 dark:text-white">{selectedApplicationIds.length}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const selectable = sortedApplications
                      .filter((app) => {
                        const s = String(app.status || "").toLowerCase();
                        return s === "pending" || s === "new";
                      })
                      .map((app) => app.id);
                    setSelectedApplicationIds(selectable);
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Select All Pending
                </button>
                <button
                  onClick={() => setSelectedApplicationIds([])}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Clear
                </button>
                <button
                  onClick={bulkMoveToInProcess}
                  disabled={selectedApplicationIds.length === 0}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                >
                  Proceed Selected
                </button>
              </div>
            </div>
            {sortedApplications.map((app) => (
              <div
                key={app.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800"
              >
                {(() => {
                  const s = String(app.status || "").toLowerCase();
                  const selectable = s === "pending" || s === "new";
                  return (
                    <div className="mb-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedApplicationIds.includes(app.id)}
                        disabled={!selectable}
                        onChange={(e) => toggleSelectApplication(app.id, e.target.checked)}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selectable ? "Select for bulk proceed" : "Only pending/new can be bulk selected"}
                      </span>
                    </div>
                  );
                })()}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                      {app.candidate.fullName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {app.candidate.fullName}
                          {app.jobTitle && (
                            <span className="ml-2 text-sm font-normal text-gray-500">
                              for {app.jobTitle}
                            </span>
                          )}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {app.candidate.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {app.candidate.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(app.appliedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${getScoreColor(app.matchScore || 0)} mb-1`}>
                      {app.matchScore}%
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <Star className="w-4 h-4 fill-current" />
                      Match Score
                    </div>
                  </div>
                </div>

                {app.candidate.profile && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Profile Overview</h4>
                    <div className="space-y-2 text-sm">
                      {app.candidate.profile.skills && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Skills: </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {app.candidate.profile.skills.join(', ')}
                          </span>
                        </div>
                      )}
                      {app.candidate.profile.experience && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Experience: </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {app.candidate.profile.experience}
                          </span>
                        </div>
                      )}
                      {app.candidate.profile.education && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Education: </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {app.candidate.profile.education}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {app.coverLetter && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Cover Letter
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                      {app.coverLetter}
                    </p>
                  </div>
                )}

                {/* Audit Trail */}
                {app.auditLog && app.auditLog.length > 0 && (
                  <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Status History (Audit Trail)
                    </h4>
                    <div className="space-y-3">
                      {app.auditLog.map((log, idx) => (
                        <div key={idx} className="flex flex-col relative pl-4 border-l-2 border-gray-300 dark:border-gray-600 last:border-l-0 pb-1">
                          {idx !== app.auditLog!.length - 1 && <div className="absolute left-[-9px] top-1 w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800" />}
                          {idx === app.auditLog!.length - 1 && <div className="absolute left-[-9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800" />}
                          <div className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider pl-2">{log.status}</div>
                          <div className="text-xs text-gray-500 pl-2">{new Date(log.timestamp).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {(app.status?.toLowerCase() === 'pending' || app.status?.toLowerCase() === 'new') && (
                    <>
                      <button
                        onClick={() => updateApplicationStatus(app.id, 'in-process')}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => updateApplicationStatus(app.id, 'rejected')}
                        className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                  {app.status?.toLowerCase() === 'in-process' && (
                    <>
                      <button
                        onClick={() => navigate(`/recruiter/send-offer/${app.id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Send Offer Letter
                      </button>
                      <button
                        onClick={() => updateApplicationStatus(app.id, 'rejected')}
                        className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                  {app.status?.toLowerCase() === 'rejected' && (
                    <span className="flex items-center gap-2 px-4 py-2 text-red-500 text-sm font-medium">
                      <XCircle className="w-4 h-4" />
                      Rejected
                    </span>
                  )}
                  <button
                    onClick={() => navigate(`/candidate/profile?id=${app.candidateId}`)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No applications yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Applications will appear here once candidates start applying
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
