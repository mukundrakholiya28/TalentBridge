import { useMemo, useState } from "react";
import { useNavigate, useParams } from "@/lib/router-compat";
import { RecruiterHeader } from "../components/RecruiterHeader";
import { apiClient } from "../../utils/apiClient";
import { toast } from "sonner";

const LANGUAGE_OPTIONS = ["python", "javascript", "typescript", "java", "cpp", "c", "go"];

type Question = {
  prompt: string;
  options: string[];
  correctAnswer: string;
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

const emptyCodingQuestion = (): CodingQuestion => ({
  title: "",
  problemStatement: "",
  language: "python",
  starterCode: "",
  testCases: [
    { input: "", expectedOutput: "", isHidden: false },
    { input: "", expectedOutput: "", isHidden: true }
  ],
  points: 10
});

export function RecruiterCreateAssessment() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("Technical OA");
  const [instructions, setInstructions] = useState("Choose the best answer for each question.");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([
    { prompt: "", options: ["", "", "", ""], correctAnswer: "", points: 1 }
  ]);
  const [codingQuestions, setCodingQuestions] = useState<CodingQuestion[]>([]);

  const mcqPoints = useMemo(
    () => questions.reduce((sum, q) => sum + Number(q.points || 0), 0),
    [questions]
  );
  const codingPoints = useMemo(
    () => codingQuestions.reduce((sum, cq) => sum + Number(cq.points || 0), 0),
    [codingQuestions]
  );
  const totalPoints = mcqPoints + codingPoints;

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const updateCodingQuestion = (idx: number, patch: Partial<CodingQuestion>) => {
    setCodingQuestions((prev) => prev.map((cq, i) => (i === idx ? { ...cq, ...patch } : cq)));
  };

  const updateTestCase = (cqIdx: number, tcIdx: number, patch: Partial<TestCase>) => {
    setCodingQuestions((prev) =>
      prev.map((cq, i) =>
        i === cqIdx
          ? { ...cq, testCases: cq.testCases.map((tc, j) => (j === tcIdx ? { ...tc, ...patch } : tc)) }
          : cq
      )
    );
  };

  const addTestCase = (cqIdx: number) => {
    setCodingQuestions((prev) =>
      prev.map((cq, i) =>
        i === cqIdx
          ? { ...cq, testCases: [...cq.testCases, { input: "", expectedOutput: "", isHidden: false }] }
          : cq
      )
    );
  };

  const removeTestCase = (cqIdx: number, tcIdx: number) => {
    setCodingQuestions((prev) =>
      prev.map((cq, i) =>
        i === cqIdx ? { ...cq, testCases: cq.testCases.filter((_, j) => j !== tcIdx) } : cq
      )
    );
  };

  const submit = async () => {
    if (!applicationId) return;
    setSubmitting(true);
    try {
      const payload = {
        applicationId,
        title,
        instructions,
        durationMinutes,
        dueDate: dueDate ? new Date(`${dueDate}T09:00:00`).toISOString() : undefined,
        questions,
        codingQuestions
      };
      const data = await apiClient.post("/oa/assessments", payload);
      if (!data?.success) throw new Error(data?.message || "Failed to create OA");
      toast.success("Integrated OA created and assigned");
      navigate(`/recruiter/assessment/${data.assessment._id}/results`);
    } catch (error) {
      console.error("Create assessment error:", error);
      toast.error("Failed to create assessment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RecruiterHeader />
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Integrated OA</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Application ID: {applicationId}</p>

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Proctoring is enabled by default. Tab-switch events and coding snapshots are tracked automatically.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="block text-xs mb-1 text-gray-500">Assessment title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Assessment title"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-500">Duration (minutes)</label>
              <input
                type="number"
                min={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value || 60))}
                placeholder="Duration minutes"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-500">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-500">Instructions</label>
              <input
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instructions"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* MCQ Section */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">MCQ Section</h2>
              <button
                onClick={() =>
                  setQuestions((prev) => [...prev, { prompt: "", options: ["", "", "", ""], correctAnswer: "", points: 1 }])
                }
                className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
              >
                + Add MCQ
              </button>
            </div>
            {questions.map((q, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900 dark:text-white">Question {idx + 1}</p>
                  {questions.length > 1 && (
                    <button
                      onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  value={q.prompt}
                  onChange={(e) => updateQuestion(idx, { prompt: e.target.value })}
                  placeholder="Question prompt"
                  className="w-full mb-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <div className="grid md:grid-cols-2 gap-2">
                  {q.options.map((opt, oi) => (
                    <input
                      key={oi}
                      value={opt}
                      onChange={(e) => {
                        const next = [...q.options];
                        next[oi] = e.target.value;
                        updateQuestion(idx, { options: next });
                      }}
                      placeholder={`Option ${oi + 1}`}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  ))}
                </div>
                <div className="grid md:grid-cols-2 gap-2 mt-2">
                  <input
                    value={q.correctAnswer}
                    onChange={(e) => updateQuestion(idx, { correctAnswer: e.target.value })}
                    placeholder="Correct answer (exact option text)"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="number"
                    min={1}
                    value={q.points}
                    onChange={(e) => updateQuestion(idx, { points: Number(e.target.value || 1) })}
                    placeholder="Points"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Coding Questions Section */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Coding Questions</h2>
              <button
                onClick={() => setCodingQuestions((prev) => [...prev, emptyCodingQuestion()])}
                className="px-3 py-1 text-xs border border-emerald-400 dark:border-emerald-600 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                + Add Coding Question
              </button>
            </div>

            {codingQuestions.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No coding questions added. Click "Add Coding Question" to create HackerRank-style problems with test cases.
              </p>
            )}

            {codingQuestions.map((cq, cqIdx) => (
              <div key={cqIdx} className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-900 dark:text-white">Coding Question {cqIdx + 1}</p>
                  <button
                    onClick={() => setCodingQuestions((prev) => prev.filter((_, i) => i !== cqIdx))}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-3">
                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      value={cq.title}
                      onChange={(e) => updateCodingQuestion(cqIdx, { title: e.target.value })}
                      placeholder="Problem title (e.g., Two Sum)"
                      className="md:col-span-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                    <select
                      value={cq.language}
                      onChange={(e) => updateCodingQuestion(cqIdx, { language: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={cq.points}
                      onChange={(e) => updateCodingQuestion(cqIdx, { points: Number(e.target.value || 10) })}
                      placeholder="Points"
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <textarea
                    value={cq.problemStatement}
                    onChange={(e) => updateCodingQuestion(cqIdx, { problemStatement: e.target.value })}
                    rows={5}
                    placeholder={"Problem Statement\n\nDescribe the problem clearly. Include:\n- Input format\n- Output format\n- Constraints\n- Examples"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                  />

                  <textarea
                    value={cq.starterCode}
                    onChange={(e) => updateCodingQuestion(cqIdx, { starterCode: e.target.value })}
                    rows={4}
                    placeholder="Starter code / function signature (optional)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono text-sm"
                  />

                  {/* Test Cases */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Test Cases</p>
                      <button
                        onClick={() => addTestCase(cqIdx)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        + Add Test Case
                      </button>
                    </div>
                    <div className="space-y-2">
                      {cq.testCases.map((tc, tcIdx) => (
                        <div key={tcIdx} className="grid md:grid-cols-[1fr_1fr_auto_auto] gap-2 items-start p-2 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Input</label>
                            <textarea
                              value={tc.input}
                              onChange={(e) => updateTestCase(cqIdx, tcIdx, { input: e.target.value })}
                              rows={2}
                              placeholder="stdin input"
                              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Expected Output</label>
                            <textarea
                              value={tc.expectedOutput}
                              onChange={(e) => updateTestCase(cqIdx, tcIdx, { expectedOutput: e.target.value })}
                              rows={2}
                              placeholder="expected stdout"
                              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white font-mono"
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1 pt-4">
                            <label className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tc.isHidden}
                                onChange={(e) => updateTestCase(cqIdx, tcIdx, { isHidden: e.target.checked })}
                              />
                              Hidden
                            </label>
                          </div>
                          <div className="pt-4">
                            {cq.testCases.length > 1 && (
                              <button
                                onClick={() => removeTestCase(cqIdx, tcIdx)}
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                X
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Hidden test cases are used for final grading but candidates cannot see expected output.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total points: <span className="font-semibold">{totalPoints}</span>
              {mcqPoints > 0 && codingPoints > 0 && (
                <span className="text-xs ml-2">(MCQ: {mcqPoints} + Coding: {codingPoints})</span>
              )}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={submit}
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70"
              >
                {submitting ? "Creating..." : "Create OA"}
              </button>
              <button
                onClick={() => navigate("/recruiter/in-process")}
                className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
