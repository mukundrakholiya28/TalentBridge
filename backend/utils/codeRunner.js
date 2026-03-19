const HE_API_URL = "https://api.hackerearth.com/v4/partner/code-evaluation/submissions/";
const HE_CLIENT_SECRET = process.env.HE_CLIENT_SECRET;
const TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 45;
const POLL_REQUEST_TIMEOUT_MS = 5000;
const POLL_TOTAL_TIMEOUT_MS = 90000;
const OUTPUT_FETCH_TIMEOUT_MS = 5000;

// Map app language names → HackerEarth language codes
const HE_LANGUAGE_MAP = {
    javascript: "JAVASCRIPT_NODE",
    python:     "PYTHON3",
    typescript: "TYPESCRIPT",
    java:       "JAVA8",
    cpp:        "CPP17",
    c:          "C",
    go:         "GO"
};

const NON_TERMINAL_STATUSES = new Set([
    "NA",
    "PENDING",
    "QUEUED",
    "IN-QUEUE",
    "PROCESSING",
    "RUNNING"
]);

const isHttpUrl = (value) => {
    if (!value) return false;
    const str = String(value).trim();
    return str.startsWith("http://") || str.startsWith("https://");
};

const resolveRemoteOutput = async (value) => {
    const raw = String(value || "");
    if (!isHttpUrl(raw)) return raw;

    try {
        const response = await fetch(raw, { signal: AbortSignal.timeout(OUTPUT_FETCH_TIMEOUT_MS) });
        if (!response.ok) return raw;
        return await response.text();
    } catch {
        // Fallback to the raw value if remote output fetch fails.
        return raw;
    }
};

/**
 * Execute code via the HackerEarth Code Evaluation API.
 * POST /v4/partner/code-evaluation/submissions/ → poll status_update_url until done.
 */
const runCode = async (code, language, input = "", timeoutMs = TIMEOUT_MS) => {
    if (!code || !language) {
        return { stdout: "", stderr: "No code or language provided", exitCode: 1, timedOut: false };
    }

    const heLang = HE_LANGUAGE_MAP[language];
    if (!heLang) {
        return { stdout: "", stderr: `Unsupported language: ${language}`, exitCode: 1, timedOut: false };
    }

    if (!HE_CLIENT_SECRET) {
        return { stdout: "", stderr: "HackerEarth client secret not configured", exitCode: 1, timedOut: false };
    }

    try {
        // Step 1: Submit code
        const submitRes = await fetch(HE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "client-secret": HE_CLIENT_SECRET
            },
            body: JSON.stringify({
                lang: heLang,
                source: code,
                input: input || "",
                time_limit: Math.ceil(timeoutMs / 1000),
                memory_limit: 262144
            }),
            signal: AbortSignal.timeout(30000)
        });

        if (!submitRes.ok) {
            const text = await submitRes.text().catch(() => "");
            return { stdout: "", stderr: `HackerEarth API error (${submitRes.status}): ${text}`, exitCode: 1, timedOut: false };
        }

        const submitData = await submitRes.json();
        const statusUrl = submitData.status_update_url;
        if (!statusUrl) {
            return { stdout: "", stderr: "HackerEarth did not return a status URL", exitCode: 1, timedOut: false };
        }

        // Step 2: Poll until execution is complete
        let runStatus = null;
        const pollDeadline = Date.now() + POLL_TOTAL_TIMEOUT_MS;
        for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS && Date.now() < pollDeadline; attempt++) {
            try {
                const pollRes = await fetch(statusUrl, {
                    headers: { "client-secret": HE_CLIENT_SECRET },
                    signal: AbortSignal.timeout(POLL_REQUEST_TIMEOUT_MS)
                });

                if (pollRes.ok) {
                    const pollData = await pollRes.json();
                    const status = String(pollData?.result?.run_status?.status || "").toUpperCase();

                    if (status && !NON_TERMINAL_STATUSES.has(status)) {
                        runStatus = pollData.result.run_status;
                        break;
                    }
                }
            } catch {
                // Ignore transient polling failures and keep polling until deadline.
            }

            if (attempt < POLL_MAX_ATTEMPTS - 1 && Date.now() < pollDeadline) {
                await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            }
        }

        if (!runStatus) {
            return { stdout: "", stderr: "Execution timed out waiting for result", exitCode: 1, timedOut: true };
        }

        // Step 3: Map HackerEarth status to our format
        const status = runStatus.status;
        const stdout = await resolveRemoteOutput(runStatus.output || "");
        let stderr = "";
        if (status !== "AC") {
            stderr = await resolveRemoteOutput(runStatus.stderr || runStatus.compile_message || "");
        }

        if (status === "TLE") {
            return { stdout: "", stderr: "Time Limit Exceeded", exitCode: 1, timedOut: true };
        }
        if (status === "MLE") {
            return { stdout: "", stderr: "Memory Limit Exceeded", exitCode: 1, timedOut: false };
        }
        if (status === "CE") {
            return { stdout: "", stderr: `Compilation Error:\n${stderr}`, exitCode: 1, timedOut: false };
        }
        if (status === "RE" || status === "OLE") {
            return { stdout: "", stderr: stderr || "Runtime Error", exitCode: 1, timedOut: false };
        }

        return {
            stdout,
            stderr,
            exitCode: status === "AC" || status === "NA" ? 0 : 1,
            timedOut: false
        };
    } catch (err) {
        if (err.name === "TimeoutError" || err.name === "AbortError") {
            return { stdout: "", stderr: "Execution timed out", exitCode: 1, timedOut: true };
        }
        return { stdout: "", stderr: `Code execution failed: ${err.message}`, exitCode: 1, timedOut: false };
    }
};

/**
 * Normalize output for comparison: trim trailing whitespace per line, trim overall.
 */
const normalizeOutput = (text) =>
    String(text || "")
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .trim();

/**
 * Run code against multiple test cases and return results.
 */
const evaluateTestCases = async (code, language, testCases, timeoutMs = TIMEOUT_MS) => {
    const results = [];
    for (const tc of testCases) {
        const result = await runCode(code, language, tc.input || "", timeoutMs);
        const actualOutput = normalizeOutput(result.stdout);
        const expectedOutput = normalizeOutput(tc.expectedOutput);

        let passed = false;
        if (result.timedOut) {
            results.push({
                input: tc.input || "",
                expectedOutput: tc.expectedOutput || "",
                actualOutput: "Time Limit Exceeded",
                passed: false,
                isHidden: Boolean(tc.isHidden),
                error: ""
            });
            continue;
        }
        if (result.exitCode !== 0) {
            results.push({
                input: tc.input || "",
                expectedOutput: tc.expectedOutput || "",
                actualOutput: result.stderr || "Runtime Error",
                passed: false,
                isHidden: Boolean(tc.isHidden),
                error: result.stderr || ""
            });
            continue;
        }

        passed = actualOutput === expectedOutput;
        results.push({
            input: tc.input || "",
            expectedOutput: tc.expectedOutput || "",
            actualOutput: result.stdout || "",
            passed,
            isHidden: Boolean(tc.isHidden),
            error: ""
        });
    }
    return results;
};

module.exports = { runCode, evaluateTestCases, normalizeOutput };
