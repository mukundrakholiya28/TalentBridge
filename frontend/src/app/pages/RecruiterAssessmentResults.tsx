import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RecruiterHeader } from "../components/RecruiterHeader";
import { apiClient } from "../../utils/apiClient";
import { toast } from "sonner";

type Row = {
  candidateId?: string;
  candidateName: string;
  candidateEmail: string;
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt?: string;
  tabSwitchCount: number;
  status: string;
  snapshotCount?: number;
};

type TestResult = {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  isHidden: boolean;
};

type CodingAnswer = {
  questionIndex: number;
  code: string;
  language: string;
  testResults: TestResult[];
  passedAll: boolean;
  score: number;
};

export function RecruiterAssessmentResults() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [selectedCandidateLabel, setSelectedCandidateLabel] = useState<string>("");
  const [codingAnswers, setCodingAnswers] = useState<CodingAnswer[]>([]);
  const [lastSnapshotAt, setLastSnapshotAt] = useState("");
  const [feedLoading, setFeedLoading] = useState(false);
  const [expandedCodingIdx, setExpandedCodingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!assessmentId) return;
    const load = async () => {
      try {
        const data = await apiClient.get(`/oa/assessments/${assessmentId}/results`);
        if (!data?.success) throw new Error(data?.message || "Failed to load results");
        setTitle(data.assessment?.title || "Assessment");
        setRows(Array.isArray(data.scoreboard) ? data.scoreboard : []);
      } catch (error) {
        console.error("Assessment results error:", error);
        toast.error("Failed to load assessment results");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assessmentId]);

  useEffect(() => {
    if (!assessmentId || !selectedCandidateId) return;
    const loadFeed = async () => {
      setFeedLoading(true);
      try {
        const data = await apiClient.get(
          `/oa/assessments/${assessmentId}/code-feed?candidateId=${encodeURIComponent(selectedCandidateId)}`
        );
        if (data?.success) {
          setCodingAnswers(Array.isArray(data.codingAnswers) ? data.codingAnswers : []);
          const snapshots = Array.isArray(data.snapshots) ? data.snapshots : [];
          const last = snapshots.length ? snapshots[snapshots.length - 1] : null;
          setLastSnapshotAt(last?.timestamp ? new Date(last.timestamp).toLocaleTimeString() : "");
        }
      } catch {
        // Keep last loaded values.
      } finally {
        setFeedLoading(false);
      }
    };

    loadFeed();
    const timer = setInterval(loadFeed, 5000);
    return () => clearInterval(timer);
  }, [assessmentId, selectedCandidateId]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RecruiterHeader />
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Scoreboard: {title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Ranked by score (auto-graded, coding questions scored by test cases)</p>

          {loading ? (
            <div className="py-8">Loading results...</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-gray-600 dark:text-gray-400">No submissions yet.</div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-800">
                    <th className="py-2">Candidate</th>
                    <th className="py-2">Score</th>
                    <th className="py-2">Submitted</th>
                    <th className="py-2">Tab Switches</th>
                    <th className="py-2">Snapshots</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2">
                        <p className="font-medium text-gray-900 dark:text-white">{r.candidateName}</p>
                        <p className="text-xs text-gray-500">{r.candidateEmail}</p>
                      </td>
                      <td className="py-2">{r.score}/{r.maxScore} ({Number(r.percentage || 0).toFixed(1)}%)</td>
                      <td className="py-2">{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "-"}</td>
                      <td className="py-2">{r.tabSwitchCount}</td>
                      <td className="py-2">{r.snapshotCount || 0}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === "submitted" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => {
                            setSelectedCandidateId(r.candidateId || "");
                            setSelectedCandidateLabel(`${r.candidateName} (${r.candidateEmail})`);
                            setExpandedCodingIdx(null);
                          }}
                          className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          View Code
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Coding Answers Panel */}
          {selectedCandidateId && (
            <div className="mt-6 p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-900 dark:text-white">Coding Results: {selectedCandidateLabel}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {feedLoading ? "Refreshing..." : "Auto-refresh every 5s"}
                    {lastSnapshotAt ? ` | Last snapshot: ${lastSnapshotAt}` : ""}
                  </span>
                  <button
                    onClick={() => { setSelectedCandidateId(""); setCodingAnswers([]); }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-2">
                <p className="text-xs text-red-700 dark:text-red-300">
                  Proctor note: high tab-switch count + sparse snapshots can indicate low assessment integrity.
                </p>
              </div>

              {codingAnswers.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No coding submissions yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {codingAnswers.map((ca, idx) => {
                    const passedCount = ca.testResults.filter((r) => r.passed).length;
                    const totalCount = ca.testResults.length;
                    const isExpanded = expandedCodingIdx === idx;

                    return (
                      <div key={idx} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedCodingIdx(isExpanded ? null : idx)}
                          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              Question {ca.questionIndex + 1}
                            </span>
                            <span className="text-xs text-gray-500">{ca.language}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${ca.passedAll ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                              {passedCount}/{totalCount} passed
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Score: {ca.score}</span>
                            <span className="text-xs">{isExpanded ? "▲" : "▼"}</span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-4 space-y-3">
                            <div>
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Submitted Code:</p>
                              <pre className="overflow-auto bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono max-h-[300px]">
                                {ca.code || "// No code submitted"}
                              </pre>
                            </div>

                            <div>
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Test Case Results:</p>
                              <div className="space-y-2">
                                {ca.testResults.map((tr, trIdx) => (
                                  <div key={trIdx} className={`rounded border p-2 text-xs ${tr.passed ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10"}`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">
                                        Test {trIdx + 1} {tr.isHidden && "(Hidden)"}
                                      </span>
                                      <span className={`font-bold ${tr.passed ? "text-green-600" : "text-red-600"}`}>
                                        {tr.passed ? "PASSED" : "FAILED"}
                                      </span>
                                    </div>
                                    <div className="font-mono text-gray-700 dark:text-gray-300 space-y-0.5">
                                      <p>Input: {tr.input || "(empty)"}</p>
                                      <p>Expected: {tr.expectedOutput}</p>
                                      {!tr.passed && <p className="text-red-600 dark:text-red-400">Actual: {tr.actualOutput || "(empty)"}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-5">
            <button
              onClick={() => navigate("/recruiter/in-process")}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
