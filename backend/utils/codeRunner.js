const PISTON_API_URL = process.env.PISTON_API_URL || "https://emkc.run/api/v2/piston";
const TIMEOUT_MS = 10000;

// Map app language names → Piston language identifiers and versions
const PISTON_LANGUAGE_MAP = {
    javascript: { language: "javascript", version: "18.15.0" },
    python:     { language: "python",     version: "3.10.0"  },
    typescript: { language: "typescript", version: "5.0.3"   },
    java:       { language: "java",       version: "15.0.2"  },
    cpp:        { language: "c++",        version: "10.2.0"  },
    c:          { language: "c",          version: "10.2.0"  },
    go:         { language: "go",         version: "1.16.2"  }
};

/**
 * Execute code via the Piston API.
 * POST /api/v2/piston/execute
 * { language, version, files: [{ content }], stdin, run_timeout }
 * Returns { run: { stdout, stderr, code, signal, output }, compile?: { ... } }
 */
const runCode = async (code, language, input = "", timeoutMs = TIMEOUT_MS) => {
    if (!code || !language) {
        return { stdout: "", stderr: "No code or language provided", exitCode: 1, timedOut: false };
    }

    const pistonLang = PISTON_LANGUAGE_MAP[language];
    if (!pistonLang) {
        return { stdout: "", stderr: `Unsupported language: ${language}`, exitCode: 1, timedOut: false };
    }

    try {
        const response = await fetch(`${PISTON_API_URL}/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                language: pistonLang.language,
                version: pistonLang.version,
                files: [{ content: code }],
                stdin: input,
                run_timeout: timeoutMs
            }),
            signal: AbortSignal.timeout(Math.max(timeoutMs + 5000, 30000))
        });

        if (!response.ok) {
            const text = await response.text().catch(() => "");
            return { stdout: "", stderr: `Piston API error (${response.status}): ${text}`, exitCode: 1, timedOut: false };
        }

        const data = await response.json();

        // Handle compilation errors (for compiled languages)
        if (data.compile && data.compile.code !== 0 && data.compile.stderr) {
            return {
                stdout: "",
                stderr: `Compilation Error:\n${data.compile.stderr}`,
                exitCode: 1,
                timedOut: false
            };
        }

        const run = data.run || {};
        const timedOut = run.signal === "SIGKILL" || run.signal === "SIGXCPU";

        return {
            stdout: String(run.stdout || ""),
            stderr: String(run.stderr || ""),
            exitCode: run.code != null ? run.code : 1,
            timedOut
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
