const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

const TIMEOUT_MS = 10000;
const MAX_OUTPUT_SIZE = 1024 * 64; // 64 KB

const LANGUAGE_CONFIG = {
    javascript: { cmd: "node", ext: ".js" },
    python: { cmd: process.platform === "win32" ? "python" : "python3", ext: ".py" },
    typescript: { cmd: "npx", args: ["tsx"], ext: ".ts" },
    cpp: { compile: true, compiler: "g++", ext: ".cpp", outExt: process.platform === "win32" ? ".exe" : "" },
    c: { compile: true, compiler: "gcc", ext: ".c", outExt: process.platform === "win32" ? ".exe" : "" },
    java: { compile: true, compiler: "javac", ext: ".java", runner: "java" },
    go: { cmd: "go", args: ["run"], ext: ".go" }
};

const makeTempDir = () => {
    const dir = path.join(os.tmpdir(), `tb-runner-${crypto.randomBytes(8).toString("hex")}`);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
};

const cleanupDir = (dir) => {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch {
        // best effort
    }
};

const spawnWithTimeout = (cmd, args, options, timeoutMs) => {
    return new Promise((resolve) => {
        let stdout = "";
        let stderr = "";
        let killed = false;

        const proc = spawn(cmd, args, {
            ...options,
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true
        });

        const timer = setTimeout(() => {
            killed = true;
            proc.kill("SIGKILL");
        }, timeoutMs);

        proc.stdout.on("data", (chunk) => {
            if (stdout.length < MAX_OUTPUT_SIZE) stdout += chunk.toString();
        });
        proc.stderr.on("data", (chunk) => {
            if (stderr.length < MAX_OUTPUT_SIZE) stderr += chunk.toString();
        });

        proc.on("close", (code) => {
            clearTimeout(timer);
            resolve({ stdout, stderr, exitCode: code, timedOut: killed });
        });

        proc.on("error", (err) => {
            clearTimeout(timer);
            resolve({ stdout, stderr: err.message, exitCode: 1, timedOut: false });
        });

        if (options.input != null) {
            proc.stdin.write(options.input);
            proc.stdin.end();
        } else {
            proc.stdin.end();
        }
    });
};

const compileAndRun = async (code, language, input, timeoutMs) => {
    const config = LANGUAGE_CONFIG[language];
    if (!config) return { stdout: "", stderr: `Unsupported language: ${language}`, exitCode: 1, timedOut: false };

    const tmpDir = makeTempDir();
    try {
        if (language === "java") {
            // Extract public class name or use Main
            const classMatch = code.match(/public\s+class\s+(\w+)/);
            const className = classMatch ? classMatch[1] : "Main";
            const srcFile = path.join(tmpDir, `${className}.java`);
            fs.writeFileSync(srcFile, code);

            const compileResult = await spawnWithTimeout(config.compiler, [srcFile], { cwd: tmpDir }, timeoutMs);
            if (compileResult.exitCode !== 0) {
                return { stdout: "", stderr: `Compilation Error:\n${compileResult.stderr}`, exitCode: 1, timedOut: false };
            }
            return await spawnWithTimeout(config.runner, ["-cp", tmpDir, className], { cwd: tmpDir, input }, timeoutMs);
        }

        if (config.compile) {
            const srcFile = path.join(tmpDir, `solution${config.ext}`);
            const outFile = path.join(tmpDir, `solution${config.outExt}`);
            fs.writeFileSync(srcFile, code);

            const compileResult = await spawnWithTimeout(config.compiler, [srcFile, "-o", outFile], { cwd: tmpDir }, timeoutMs);
            if (compileResult.exitCode !== 0) {
                return { stdout: "", stderr: `Compilation Error:\n${compileResult.stderr}`, exitCode: 1, timedOut: false };
            }
            return await spawnWithTimeout(outFile, [], { cwd: tmpDir, input }, timeoutMs);
        }

        // Interpreted languages
        const srcFile = path.join(tmpDir, `solution${config.ext}`);
        fs.writeFileSync(srcFile, code);

        const cmdArgs = [...(config.args || []), srcFile];
        return await spawnWithTimeout(config.cmd, cmdArgs, { cwd: tmpDir, input }, timeoutMs);
    } finally {
        cleanupDir(tmpDir);
    }
};

/**
 * Run code with a single input and return the result.
 */
const runCode = async (code, language, input = "", timeoutMs = TIMEOUT_MS) => {
    if (!code || !language) {
        return { stdout: "", stderr: "No code or language provided", exitCode: 1, timedOut: false };
    }
    return compileAndRun(code, language, input, timeoutMs);
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
