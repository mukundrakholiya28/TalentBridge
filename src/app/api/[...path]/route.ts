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

  // ── Routes (mounted with and without /api prefix for bulletproof routing) ──
  app.use("/api/auth",         require("../../../../server/routes/auth"));
  app.use("/auth",             require("../../../../server/routes/auth"));

  app.use("/api/jobs",         require("../../../../server/routes/jobs"));
  app.use("/jobs",             require("../../../../server/routes/jobs"));

  app.use("/api/applications", require("../../../../server/routes/applications"));
  app.use("/applications",     require("../../../../server/routes/applications"));

  app.use("/api/messages",     require("../../../../server/routes/messages"));
  app.use("/messages",         require("../../../../server/routes/messages"));

  app.use("/api/evaluation",   require("../../../../server/routes/evaluation"));
  app.use("/evaluation",       require("../../../../server/routes/evaluation"));

  app.use("/api/rag",          require("../../../../server/routes/ragSearch"));
  app.use("/rag",              require("../../../../server/routes/ragSearch"));

  app.use("/api/ats",          require("../../../../server/routes/ats"));
  app.use("/ats",              require("../../../../server/routes/ats"));

  app.use("/api/resume",       require("../../../../server/routes/resume"));
  app.use("/resume",           require("../../../../server/routes/resume"));

  app.use("/api/offers",       require("../../../../server/routes/offers"));
  app.use("/offers",           require("../../../../server/routes/offers"));

  app.use("/api/oa",           require("../../../../server/routes/oa"));
  app.use("/oa",               require("../../../../server/routes/oa"));

  app.use("/api/candidate",    require("../../../../server/routes/candidate"));
  app.use("/candidate",        require("../../../../server/routes/candidate"));

  app.use("/api/recruiter",    require("../../../../server/routes/recruiter"));
  app.use("/recruiter",        require("../../../../server/routes/recruiter"));

  const authMiddleware             = require("../../../../server/middleware/authMiddleware");
  const { uploadResume }           = require("../../../../server/controllers/resumeController");

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
    console.error("[Express API Error Stack]", err.stack);
    
    // Handle multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        success: false, 
        error: "File too large. Maximum size is 5MB." 
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        success: false, 
        error: "Unexpected file field. Use 'resume' as the field name." 
      });
    }
    
    // Handle request aborted errors
    if (err.message?.includes('Request aborted') || err.code === 'ECONNRESET') {
      return res.status(408).json({ 
        success: false, 
        error: "Upload interrupted. Please try again with a smaller file." 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: err?.message || "Internal Server Error" 
    });
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
    
    // Check content-length before reading body
    const contentLength = parseInt(req.headers.get('content-length') || '0');
    if (contentLength > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 5MB." },
        { status: 413 }
      );
    }
    
    let bodyBuf: Buffer;
    try {
      bodyBuf = Buffer.from(await req.arrayBuffer());
    } catch (bufErr: any) {
      console.error('[API Route] Error reading request body:', bufErr);
      return NextResponse.json(
        { success: false, error: "Failed to read request body. Please try with a smaller file." },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    const queryStr = req.nextUrl.search || "";
    const url = req.nextUrl.pathname + queryStr;

    const { Readable } = require("stream");

    return new Promise<NextResponse>((resolve) => {
      const chunks: Buffer[] = [];
      const resHeaders: Record<string, string> = {};
      let status = 200;

      let dataPushed = false;
      let streamError: Error | null = null;
      
      const mockReq: any = new Readable({
        read() {
          if (!dataPushed) {
            dataPushed = true;
            if (bodyBuf.length > 0) {
              this.push(bodyBuf);
            }
            this.push(null);
          }
        }
      });

      mockReq.on('error', (err: Error) => {
        console.error('[API Route] Request stream error:', err);
        streamError = err;
      });

      mockReq.method = req.method;
      mockReq.url = url;
      mockReq.originalUrl = url;
      mockReq.headers = headers;
      mockReq.socket = { remoteAddress: "127.0.0.1" };
      mockReq.connection = {};
      
      // For file uploads, ensure proper content-length
      if (bodyBuf.length > 0 && headers['content-type']?.includes('multipart/form-data')) {
        mockReq.headers['content-length'] = String(bodyBuf.length);
      }

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

        locals: {},
        app: app,
      };

      (app as any)(mockReq, mockRes, (err?: any) => {
        if (err) {
          console.error("[Express Error Callback]", err);
          console.error("[Express Error Callback Stack]", err.stack);
          
          // Handle specific error cases
          if (err.message?.includes('Request aborted')) {
            return resolve(NextResponse.json(
              { success: false, error: "Upload interrupted. Please try with a smaller PDF file (under 2MB)." }, 
              { status: 408 }
            ));
          }
          
          return resolve(NextResponse.json(
            { success: false, error: err?.message || String(err) }, 
            { status: 500 }
          ));
        }
        resolve(NextResponse.json({ error: `Route ${url} not found` }, { status: 404 }));
      });
    });
  } catch (err: any) {
    console.error("[API route]", err);
    console.error("[API route stack]", err.stack);
    return NextResponse.json(
      { success: false, error: err?.message ?? "Internal Server Error" },
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

// Increase body size limit for file uploads
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for file processing
