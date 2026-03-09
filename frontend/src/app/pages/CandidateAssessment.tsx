import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardHeader } from "../components/DashboardHeader";
import { apiClient } from "../../utils/apiClient";
import { toast } from "sonner";
import Editor, { loader } from "@monaco-editor/react";

// Ensure Monaco loads from CDN with explicit config
loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs"
  }
});

type Question = {
  prompt: string;
  options: string[];
  points: number;
};

type TestCase = {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
};

type CodingQuestion = {
  title: string;
  problemStatement: string;
  language: string;
  starterCode: string;
  testCases: TestCase[];
  points: number;
};

type TestResult = {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  isHidden: boolean;
};

type Assessment = {
  _id: string;
  title: string;
  instructions: string;
  durationMinutes: number;
  dueDate?: string;
  totalPoints: number;
  status: string;
  questions: Question[];
  codingQuestions: CodingQuestion[];
};

const MONACO_LANGUAGE_MAP: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  cpp: "cpp",
  c: "c",
  go: "go"
};

const formatTime = (seconds: number) => {
  const s = Math.max(0, Number(seconds || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

export function CandidateAssessment() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number; percentage: number } | null>(null);

  // Coding question state
  const [codeSolutions, setCodeSolutions] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<"mcq" | number>("mcq");
  const [testResults, setTestResults] = useState<Record<number, TestResult[]>>({});
  const [runningTests, setRunningTests] = useState<Record<number, boolean>>({});

  // Snapshot timer ref
  const snapshotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dueText = useMemo(() => {
    if (!assessment?.dueDate) return "";
    return new Date(assessment.dueDate).toLocaleString();
  }, [assessment?.dueDate]);

  const hasCodingQuestions = (assessment?.codingQuestions?.length || 0) > 0;
  const hasMCQs = (assessment?.questions?.length || 0) > 0;

  useEffect(() => {
    if (!assessmentId) return;
    const load = async () => {
      try {
        const data = await apiClient.get(`/oa/assessments/${assessmentId}`);
        if (data?.success) {
          setAssessment(data.assessment);
          const initialRemaining = Number(data?.timing?.remainingSeconds);
          setRemainingSeconds(Number.isFinite(initialRemaining) ? initialRemaining : Number(data.assessment?.durationMinutes || 0) * 60);

          // Restore MCQ answers
          const previousAnswers = Array.isArray(data?.attempt?.answers) ? data.attempt.answers : [];
          const mapped: Record<number, string> = {};
          for (const a of previousAnswers) {
            if (Number.isInteger(a?.questionIndex)) mapped[a.questionIndex] = String(a?.answer || "");
          }
          setAnswers(mapped);

          // Restore coding answers
          const previousCoding = Array.isArray(data?.attempt?.codingAnswers) ? data.attempt.codingAnswers : [];
          const codeMap: Record<number, string> = {};
          for (const ca of previousCoding) {
            if (Number.isInteger(ca?.questionIndex)) codeMap[ca.questionIndex] = String(ca?.code || "");
          }
          // Initialize with starter code for questions without previous answers
          const codingQs: CodingQuestion[] = data.assessment?.codingQuestions || [];
          for (let i = 0; i < codingQs.length; i++) {
            if (!(i in codeMap)) codeMap[i] = codingQs[i].starterCode || "";
          }
          setCodeSolutions(codeMap);

          // Default to first tab with content
          if ((data.assessment?.questions?.length || 0) > 0) {
            setActiveTab("mcq");
          } else if (codingQs.length > 0) {
            setActiveTab(0);
          }
        } else {
          throw new Error(data?.message || "Assessment not found");
        }
      } catch (error) {
        console.error("Load assessment error:", error);
        toast.error("Failed to load assessment");
        navigate("/candidate/in-process");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assessmentId, navigate]);

  // Proctoring: tab switch detection
  useEffect(() => {
    if (!assessmentId) return;
    const sendProctor = () => {
      apiClient.post(`/oa/assessments/${assessmentId}/proctor`, {
        type: "tab-switch",
        details: "Candidate switched tab/window visibility"
      }).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendProctor();
    };
    const onBlur = () => sendProctor();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [assessmentId]);

  // Code snapshot auto-save every 30 seconds
  useEffect(() => {
    if (!assessmentId || !hasCodingQuestions) return;
    snapshotTimerRef.current = setInterval(() => {
      const idx = typeof activeTab === "number" ? activeTab : 0;
      const code = codeSolutions[idx] || "";
      if (code) {
        apiClient.post(`/oa/assessments/${assessmentId}/code-snapshot`, {
          code,
          questionIndex: idx
        }).catch(() => {});
      }
    }, 30000);
    return () => {
      if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current);
    };
  }, [assessmentId, activeTab, codeSolutions, hasCodingQuestions]);

  const runningTestsRef = useRef(runningTests);
  runningTestsRef.current = runningTests;

  const runTests = useCallback(async (cqIdx: number) => {
    if (!assessmentId || runningTestsRef.current[cqIdx]) return;
    setRunningTests((prev) => ({ ...prev, [cqIdx]: true }));
    try {
      const data = await apiClient.post(`/oa/assessments/${assessmentId}/run-tests`, {
        questionIndex: cqIdx,
        code: codeSolutions[cqIdx] || ""
      });
      if (data?.success) {
        setTestResults((prev) => ({ ...prev, [cqIdx]: data.testResults }));
        const passed = data.testResults.filter((r: TestResult) => r.passed).length;
        const total = data.testResults.length;
        if (passed === total) {
          toast.success(`All ${total} visible test cases passed!`);
        } else {
          toast.error(`${passed}/${total} visible test cases passed`);
        }
        if (data.totalHidden > 0) {
          toast.info(`${data.totalHidden} hidden test case(s) will be evaluated on submit`);
        }
      } else {
        toast.error(data?.message || "Test execution failed");
      }
    } catch {
      toast.error("Failed to run test cases");
    } finally {
      setRunningTests((prev) => ({ ...prev, [cqIdx]: false }));
    }
  }, [assessmentId, codeSolutions]);

  const handleSubmit = useCallback(async (isAuto = false) => {
    if (!assessmentId || !assessment) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        answers: assessment.questions.map((_, idx) => ({
          questionIndex: idx,
          answer: answers[idx] || ""
        })),
        codingAnswers: (assessment.codingQuestions || []).map((_, idx) => ({
          questionIndex: idx,
          code: codeSolutions[idx] || ""
        }))
      };
      const data = await apiClient.post(`/oa/assessments/${assessmentId}/submit`, payload);
      if (!data?.success) throw new Error(data?.message || "Submission failed");
      setResult({
        score: data.score,
        maxScore: data.maxScore,
        percentage: data.percentage
      });
      toast.success(isAuto ? "Time is up. Assessment auto-submitted." : "Assessment submitted");
    } catch (error) {
      console.error("Submit assessment error:", error);
      toast.error("Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  }, [assessmentId, assessment, submitting, answers, codeSolutions]);

  // Timer countdown
  useEffect(() => {
    if (loading || result || submitting) return;
    if (remainingSeconds <= 0) {
      if (!autoSubmitted) {
        setAutoSubmitted(true);
        void handleSubmit(true);
      }
      return;
    }
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingSeconds, loading, result, submitting, autoSubmitted, handleSubmit]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardHeader />
        <div className="max-w-4xl mx-auto p-8">Loading assessment...</div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardHeader />
        <div className="max-w-4xl mx-auto p-8">Assessment not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0ebf8] dark:bg-gray-900">
      <DashboardHeader />
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden mb-4">
          <div className="h-2 bg-violet-600" />
          <div className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{assessment.title}</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {assessment.durationMinutes} min {dueText ? `| Due: ${dueText}` : ""} | {assessment.totalPoints} pts
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${remainingSeconds <= 60 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"}`}>
                {formatTime(remainingSeconds)}
              </div>
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting || !!result}
                className="px-4 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-70"
              >
                {submitting ? "Submitting..." : result ? "Submitted" : "Submit All"}
              </button>
            </div>
          </div>
          {assessment.instructions && (
            <div className="px-4 pb-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{assessment.instructions}</p>
            </div>
          )}
        </div>

        {/* Result Banner */}
        {result && (
          <div className="mb-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="font-semibold text-green-700 dark:text-green-300">
              Score: {result.score}/{result.maxScore} ({result.percentage.toFixed(1)}%)
            </p>
            <button onClick={() => navigate("/candidate/in-process")} className="mt-2 text-sm text-green-600 hover:underline">
              Back to Dashboard
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        {(hasMCQs || hasCodingQuestions) && (
          <div className="flex gap-1 mb-4 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-800 overflow-x-auto">
            {hasMCQs && (
              <button
                onClick={() => setActiveTab("mcq")}
                className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === "mcq"
                    ? "bg-violet-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                MCQs ({assessment.questions.length})
              </button>
            )}
            {(assessment.codingQuestions || []).map((cq, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === idx
                    ? "bg-emerald-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {cq.title || `Coding ${idx + 1}`} ({cq.points}pts)
              </button>
            ))}
          </div>
        )}

        {/* MCQ Panel */}
        {activeTab === "mcq" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            {assessment.questions.map((q, idx) => (
              <div key={idx} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="font-semibold text-gray-900 dark:text-white mb-3">
                  {idx + 1}. {q.prompt}
                  <span className="ml-2 text-xs text-gray-400">({q.points} pts)</span>
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oIdx) => (
                    <label key={oIdx} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="radio"
                        name={`q-${idx}`}
                        checked={answers[idx] === opt}
                        onChange={() => setAnswers((prev) => ({ ...prev, [idx]: opt }))}
                        disabled={!!result}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Coding Question Panels */}
        {typeof activeTab === "number" && assessment.codingQuestions?.[activeTab] && (
          <CodingPanel
            question={assessment.codingQuestions[activeTab]}
            questionIndex={activeTab}
            code={codeSolutions[activeTab] || ""}
            onCodeChange={(code) => setCodeSolutions((prev) => ({ ...prev, [activeTab]: code }))}
            testResults={testResults[activeTab] || []}
            onRunTests={() => runTests(activeTab)}
            running={runningTests[activeTab] || false}
            disabled={!!result}
          />
        )}
      </div>
    </div>
  );
}

// ─── Coding Question Panel ──────────────────────────────────────────────────

type CodingPanelProps = {
  question: CodingQuestion;
  questionIndex: number;
  code: string;
  onCodeChange: (code: string) => void;
  testResults: TestResult[];
  onRunTests: () => void;
  running: boolean;
  disabled: boolean;
};

function CodingPanel({ question, code, onCodeChange, testResults, onRunTests, running, disabled }: CodingPanelProps) {
  const [showProblem, setShowProblem] = useState(true);

  const visibleTestCases = question.testCases.filter((tc) => !tc.isHidden);
  const hiddenCount = question.testCases.filter((tc) => tc.isHidden).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ minHeight: "600px" }}>
      {/* Left: Problem Statement */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProblem(true)}
              className={`px-3 py-1 rounded text-xs font-medium ${showProblem ? "bg-emerald-600 text-white" : "text-gray-600 dark:text-gray-400"}`}
            >
              Problem
            </button>
            <button
              onClick={() => setShowProblem(false)}
              className={`px-3 py-1 rounded text-xs font-medium ${!showProblem ? "bg-emerald-600 text-white" : "text-gray-600 dark:text-gray-400"}`}
            >
              Test Results {testResults.length > 0 && `(${testResults.filter((r) => r.passed).length}/${testResults.length})`}
            </button>
          </div>
          <span className="text-xs text-gray-500">{question.language} | {question.points} pts</span>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {showProblem ? (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{question.title}</h3>
              <div className="prose dark:prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
                  {question.problemStatement}
                </pre>
              </div>

              {/* Sample Test Cases */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Sample Test Cases</h4>
                {visibleTestCases.map((tc, idx) => (
                  <div key={idx} className="mb-3 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                      <div className="p-2">
                        <p className="text-xs text-gray-500 mb-1">Input</p>
                        <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{tc.input || "(empty)"}</pre>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-500 mb-1">Expected Output</p>
                        <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{tc.expectedOutput}</pre>
                      </div>
                    </div>
                  </div>
                ))}
                {hiddenCount > 0 && (
                  <p className="text-xs text-gray-500 italic mt-1">{hiddenCount} hidden test case(s) will be evaluated on submit.</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Test Results</h4>
              {testResults.length === 0 ? (
                <p className="text-sm text-gray-500">No test results yet. Click "Run Tests" to evaluate your code.</p>
              ) : (
                <div className="space-y-2">
                  {testResults.map((tr, idx) => (
                    <div key={idx} className={`rounded-lg border p-3 ${tr.passed ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">Test Case {idx + 1}</span>
                        <span className={`text-xs font-bold ${tr.passed ? "text-green-600" : "text-red-600"}`}>
                          {tr.passed ? "PASSED" : "FAILED"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-xs font-mono">
                        <div>
                          <span className="text-gray-500">Input: </span>
                          <span className="text-gray-800 dark:text-gray-200">{tr.input || "(empty)"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Expected: </span>
                          <span className="text-gray-800 dark:text-gray-200">{tr.expectedOutput}</span>
                        </div>
                        {!tr.passed && (
                          <div>
                            <span className="text-gray-500">Your Output: </span>
                            <span className="text-red-700 dark:text-red-300">{tr.actualOutput || "(empty)"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Code Editor */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Code Editor ({question.language})
          </span>
          <button
            onClick={onRunTests}
            disabled={running || disabled}
            className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
          >
            {running ? (
              <>
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running...
              </>
            ) : (
              "Run Tests"
            )}
          </button>
        </div>
        <div className="flex-1" style={{ minHeight: '400px' }}>
          <Editor
            height="100%"
            language={MONACO_LANGUAGE_MAP[question.language] || "plaintext"}
            value={code}
            onChange={(value) => onCodeChange(value || "")}
            theme="vs-dark"
            loading={
              <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-gray-400 text-sm">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading editor...
              </div>
            }
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              wordWrap: "on",
              readOnly: disabled
            }}
          />
        </div>
      </div>
    </div>
  );
}
