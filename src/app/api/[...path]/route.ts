/**
 * Next.js App Router catch-all handler that proxies /api/* requests
 * to the Express application. This lets the existing Express routes
 * (auth, jobs, applications, …) run inside a Vercel serverless function.
 */
import { NextRequest, NextResponse } from "next/server";

// Lazily build the Express app once per cold-start
let expressApp: ReturnType<typeof import("express")> | null = null;

async function getExpressApp() {
  if (expressApp) return expressApp;

  const express = (await import("express")).default;
  const multer = (await import("multer")).default;
  const cors = (await import("cors")).default;

  const app = express();
  app.use(cors({ origin: "*" }));
  app.use(express.json({ limit: "5mb" }));

  // ── Routes ───────────────────────────────────────────────────────────────
  const authRoutes        = (await import("@/../server/routes/auth")).default;
  const jobRoutes         = (await import("@/../server/routes/jobs")).default;
  const applicationRoutes = (await import("@/../server/routes/applications")).default;
  const messageRoutes     = (await import("@/../server/routes/messages")).default;
  const evaluationRoutes  = (await import("@/../server/routes/evaluation")).default;
  const ragSearchRoutes   = (await import("@/../server/routes/ragSearch")).default;
  const atsRoutes         = (await import("@/../server/routes/ats")).default;
  const resumeRoutes      = (await import("@/../server/routes/resume")).default;
  const offerRoutes       = (await import("@/../server/routes/offers")).default;
  const oaRoutes          = (await import("@/../server/routes/oa")).default;
  const candidateRoutes   = (await import("@/../server/routes/candidate")).default;
  const recruiterRoutes   = (await import("@/../server/routes/recruiter")).default;

  const authMiddleware    = (await import("@/../server/middleware/authMiddleware")).default;
  const { uploadResume }  = await import("@/../server/controllers/resumeController");

  app.use("/api/auth",         authRoutes);
  app.use("/api/jobs",         jobRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use("/api/messages",     messageRoutes);
  app.use("/api/evaluation",   evaluationRoutes);
  app.use("/api/rag",          ragSearchRoutes);
  app.use("/api/ats",          atsRoutes);
  app.use("/api/resume",       resumeRoutes);
  app.use("/api/offers",       offerRoutes);
  app.use("/api/oa",           oaRoutes);
  app.use("/api/candidate",    candidateRoutes);
  app.use("/api/recruiter",    recruiterRoutes);

  // Resume upload (multipart)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      cb(null, file.mimetype === "application/pdf");
    },
  });
  app.post("/api/upload-resume", authMiddleware, upload.single("resume"), uploadResume);

  expressApp = app;
  return app;
}

/** Convert a Next.js Request into a plain IncomingMessage-like object */
async function toNodeRequest(req: NextRequest, params: { path: string[] }) {
  const url = "/api/" + params.path.join("/") + (req.nextUrl.search ?? "");
  const body = await req.arrayBuffer();
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key] = value; });

  return { method: req.method, url, headers, body: Buffer.from(body) };
}

/** Run the Express app against a mock req/res and collect the response */
function runExpress(
  app: ReturnType<typeof import("express")>,
  nodeReq: Awaited<ReturnType<typeof toNodeRequest>>
): Promise<NextResponse> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    const resHeaders: Record<string, string> = {};
    let statusCode = 200;

    // Minimal mock of http.IncomingMessage
    const mockReq: any = {
      method:  nodeReq.method,
      url:     nodeReq.url,
      headers: nodeReq.headers,
      // Emit body as a readable stream
      on(event: string, fn: Function) {
        if (event === "data") fn(nodeReq.body);
        if (event === "end")  fn();
        return this;
      },
      pipe: () => {},
      resume: () => {},
    };

    // Minimal mock of http.ServerResponse
    const mockRes: any = {
      statusCode,
      setHeader(key: string, value: string) { resHeaders[key] = value; },
      getHeader(key: string) { return resHeaders[key]; },
      removeHeader(key: string) { delete resHeaders[key]; },
      write(chunk: any) { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); },
      end(chunk?: any) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        const body = Buffer.concat(chunks);
        resolve(
          new NextResponse(body, {
            status: mockRes.statusCode,
            headers: resHeaders,
          })
        );
      },
      writeHead(code: number, headers?: Record<string, string>) {
        mockRes.statusCode = code;
        if (headers) Object.assign(resHeaders, headers);
      },
    };

    (app as any)(mockReq, mockRes, () => {
      resolve(NextResponse.json({ error: "Not found" }, { status: 404 }));
    });
  });
}

// ── HTTP method handlers ─────────────────────────────────────────────────────

async function handler(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  try {
    const app = await getExpressApp();
    const nodeReq = await toNodeRequest(req, params);
    return await runExpress(app as any, nodeReq);
  } catch (err: any) {
    console.error("API route error:", err);
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
  }
}

export const GET     = handler;
export const POST    = handler;
export const PUT     = handler;
export const PATCH   = handler;
export const DELETE  = handler;
export const OPTIONS = handler;

// Required for Vercel: don't cache API responses
export const dynamic = "force-dynamic";
