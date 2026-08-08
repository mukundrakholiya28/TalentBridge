/**
 * Next.js App Router catch-all handler for /api/*
 *
 * All imports of the Express app are DYNAMIC (inside the handler function)
 * so webpack never touches server/ files at build time.
 * Node.js requires them at runtime — on Vercel this works because the
 * server/ directory is deployed as-is alongside the Next.js bundle.
 */
import { NextRequest, NextResponse } from "next/server";

// Polyfill DOMMatrix & DOM Web APIs for Node.js serverless environment
if (typeof (globalThis as any).DOMMatrix === "undefined") {
  class DOMMatrix {}
  class DOMMatrixReadOnly {}
  class DOMPoint {}
  class DOMRect {}
  (globalThis as any).DOMMatrix = DOMMatrix;
  (globalThis as any).DOMMatrixReadOnly = DOMMatrixReadOnly;
  (globalThis as any).DOMPoint = DOMPoint;
  (globalThis as any).DOMRect = DOMRect;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ExpressApp = (req: any, res: any, next: () => void) => void;

// ─── Singleton: built once per cold-start, reused across warm invocations ─────
let cachedApp: ExpressApp | null = null;

async function buildExpressApp(): Promise<ExpressApp> {
  if (cachedApp) return cachedApp;

  // All require() calls happen here — at runtime only, never at build time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express   = require("express") as typeof import("express");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cors      = require("cors");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const multer    = require("multer");

  const app = express();
  app.use(cors({ origin: "*" }));
  app.use(express.json({ limit: "5mb" }));

  // ── Routes (eval-require at runtime so Webpack bypasses server/node_modules compilation) ───
  const base = process.cwd() + "/server";
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const reqMod = (modPath: string) => eval("require")(modPath);

  app.use("/api/auth",         reqMod(`${base}/routes/auth`));
  app.use("/api/jobs",         reqMod(`${base}/routes/jobs`));
  app.use("/api/applications", reqMod(`${base}/routes/applications`));
  app.use("/api/messages",     reqMod(`${base}/routes/messages`));
  app.use("/api/evaluation",   reqMod(`${base}/routes/evaluation`));
  app.use("/api/rag",          reqMod(`${base}/routes/ragSearch`));
  app.use("/api/ats",          reqMod(`${base}/routes/ats`));
  app.use("/api/resume",       reqMod(`${base}/routes/resume`));
  app.use("/api/offers",       reqMod(`${base}/routes/offers`));
  app.use("/api/oa",           reqMod(`${base}/routes/oa`));
  app.use("/api/candidate",    reqMod(`${base}/routes/candidate`));
  app.use("/api/recruiter",    reqMod(`${base}/routes/recruiter`));

  const authMiddleware             = reqMod(`${base}/middleware/authMiddleware`);
  const { uploadResume }           = reqMod(`${base}/controllers/resumeController`);

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req: any, file: any, cb: any) => {
      cb(null, file.mimetype === "application/pdf");
    },
  });

  app.post("/api/upload-resume", authMiddleware, upload.single("resume"), uploadResume);

  // Express Error Handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("[Express API Error]", err);
    res.status(500).json({ success: false, error: err?.message || "Internal Server Error" });
  });

  cachedApp = app as unknown as ExpressApp;
  return cachedApp;
}

// ─── Bridge: Next.js Request → Express mock req/res → NextResponse ────────────
async function handler(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const params = await context.params;
  const path   = params.path ?? [];

  try {
    const app     = await buildExpressApp();
    const bodyBuf = Buffer.from(await req.arrayBuffer());

    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    const url = "/api/" + path.join("/") + req.nextUrl.search;

    return new Promise<NextResponse>((resolve) => {
      const chunks: Buffer[] = [];
      const resHeaders: Record<string, string> = {};
      let status = 200;

      const mockReq: any = {
        method:  req.method,
        url,
        headers,
        socket:  { remoteAddress: "127.0.0.1" },
        connection: {},
        on(event: string, fn: (data?: any) => void) {
          if (event === "data") fn(bodyBuf);
          if (event === "end")  fn();
          return this;
        },
        // needed by multer / body parsers
        pipe:   () => mockReq,
        resume: () => mockReq,
        unpipe: () => mockReq,
      };

      const mockRes: any = {
        get statusCode() { return status; },
        set statusCode(v: number) { status = v; },
        headersSent: false,
        finished: false,

        setHeader(k: string, v: string) { resHeaders[k] = v; return this; },
        getHeader(k: string) { return resHeaders[k]; },
        getHeaders() { return resHeaders; },
        removeHeader(k: string) { delete resHeaders[k]; },
        hasHeader(k: string) { return k in resHeaders; },

        writeHead(code: number, hdrs?: Record<string, string>) {
          status = code;
          if (hdrs) Object.assign(resHeaders, hdrs);
          return this;
        },
        write(chunk: any) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
          return true;
        },
        end(chunk?: any) {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
          this.headersSent = true;
          this.finished    = true;
          resolve(new NextResponse(Buffer.concat(chunks), { status, headers: resHeaders }));
        },

        // Express needs these
        locals: {},
        app: {},
      };

      app(mockReq, mockRes, () => {
        resolve(NextResponse.json({ error: "Not Found" }, { status: 404 }));
      });
    });
  } catch (err: any) {
    console.error("[API route]", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const GET     = handler;
export const POST    = handler;
export const PUT     = handler;
export const PATCH   = handler;
export const DELETE  = handler;
export const OPTIONS = handler;

// Never cache API responses on Vercel
export const dynamic = "force-dynamic";
