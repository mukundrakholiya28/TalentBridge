# Complete Migration Guide: Express to Next.js API Routes

## Overview

This guide provides step-by-step instructions to migrate from Express + Next.js hybrid to pure Next.js API routes.

## Current Architecture

```
TalentBridge/
├── server/                    # Express backend
│   ├── controllers/          # Business logic
│   ├── routes/               # Express routes
│   ├── models/               # Database models (keep these)
│   ├── utils/                # Utilities (keep these)
│   ├── middleware/           # Auth middleware (convert)
│   └── server.js             # Express server (remove)
├── server.js                 # Custom Next server (remove)
└── src/
    ├── app/
    │   └── api/
    │       └── [...path]/route.ts  # Proxy to Express (remove)
    └── lib/                  # New utilities for Next.js
```

## Target Architecture

```
TalentBridge/
├── server/                   
│   ├── models/               # Keep - imported by Next.js routes
│   ├── utils/                # Keep - imported by Next.js routes
│   └── db/                   # Keep - imported by Next.js routes
└── src/
    ├── app/
    │   └── api/              # All API routes as Next.js route handlers
    │       ├── auth/
    │       ├── jobs/
    │       ├── applications/
    │       └── ...
    └── lib/                  # Next.js utilities
        ├── auth.ts
        ├── api-response.ts
        └── file-upload.ts
```

## Migration Steps

### 1. Helper Utilities (✅ COMPLETED)

Created:
- `src/lib/auth.ts` - JWT authentication
- `src/lib/api-response.ts` - Standard responses
- `src/lib/file-upload.ts` - File upload handling

### 2. Convert Express Routes to Next.js API Routes

For each Express route file in `server/routes/`, create corresponding Next.js route handlers:

#### Pattern: Non-parameterized Routes

Express:
```javascript
// server/routes/jobs.js
router.get("/", getAllJobs);
router.post("/create", authMiddleware, createJob);
```

Next.js:
```typescript
// src/app/api/jobs/route.ts
export async function GET(request: NextRequest) {
  return handleRouteError(async () => {
    // Controller logic here
  });
}

// src/app/api/jobs/create/route.ts
export async function POST(request: NextRequest) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request);
    // Controller logic here
  });
}
```

#### Pattern: Parameterized Routes

Express:
```javascript
// server/routes/jobs.js
router.get("/:id", getJobById);
router.delete("/:id", authMiddleware, deleteJob);
```

Next.js:
```typescript
// src/app/api/jobs/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRouteError(async () => {
    const { id } = await params;
    // Controller logic here
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request);
    const { id } = await params;
    // Controller logic here
  });
}
```

#### Pattern: File Upload Routes

Express with Multer:
```javascript
const upload = multer({ storage: multer.memoryStorage() });
router.post("/upload", authMiddleware, upload.single("resume"), uploadResume);
```

Next.js:
```typescript
// src/app/api/resume/upload/route.ts
import { parseFormData, validateFile } from '@/lib/file-upload';

export async function POST(request: NextRequest) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request);
    const { fields, files } = await parseFormData(request);
    
    const file = files['resume'];
    const validation = validateFile(file, {
      maxSize: 5 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf'],
      required: true
    });
    
    if (!validation.valid) {
      return errorResponse(validation.error!, 400);
    }
    
    // Process file buffer: file.buffer
    // Controller logic here
  });
}

// Increase body size limit
export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
};
```

### 3. Route Conversion Checklist

#### ✅ Completed Routes

- [x] Auth routes (6 endpoints)
- [x] Jobs routes (6 endpoints)

#### 🔄 Remaining Routes

- [ ] Applications (8 endpoints) - includes file upload
- [ ] Messages (5 endpoints)
- [ ] Resume (4 endpoints) - includes file upload
- [ ] Evaluation (check server/routes/evaluation.js)
- [ ] RAG Search (check server/routes/ragSearch.js)
- [ ] ATS (check server/routes/ats.js)
- [ ] Offers (check server/routes/offers.js)
- [ ] OA/Online Assessment (check server/routes/oa.js)
- [ ] Candidate (check server/routes/candidate.js)
- [ ] Recruiter (check server/routes/recruiter.js)

### 4. Update package.json

Remove Express dependencies and update scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "seed": "node server/seed.js"
  },
  "dependencies": {
    // Remove these:
    // "express": "^5.2.1",
    // "cors": "^2.8.6",
    // "multer": "^2.1.1",
    
    // Keep all Next.js and other dependencies
  }
}
```

### 5. Delete Unnecessary Files

After all routes are converted:
```bash
# Delete custom servers
rm server.js
rm server/server.js

# Delete Express catch-all proxy
rm -rf src/app/api/[...path]

# Delete Express route files (keep controllers for reference until conversion is complete)
# rm -rf server/routes
# rm -rf server/middleware
# rm -rf server/controllers (optional - can delete after verifying all logic is migrated)
```

### 6. Authentication Pattern

Replace Express middleware:
```javascript
// Express
const authMiddleware = require('../middleware/authMiddleware');
router.get('/protected', authMiddleware, handler);
```

With Next.js auth helper:
```typescript
// Next.js
import { requireAuth, getUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request); // Throws if not authenticated
    const userId = getUserId(decoded);
    
    // Your logic here
  });
}
```

### 7. Request Body Parsing

Express (automatic):
```javascript
const { field1, field2 } = req.body;
```

Next.js:
```typescript
const body = await request.json();
const { field1, field2 } = body;
```

### 8. Response Pattern

Express:
```javascript
res.status(200).json({ success: true, data });
res.status(400).json({ success: false, error: "message" });
```

Next.js:
```typescript
return successResponse({ data }, 200);
return errorResponse("message", 400);
```

### 9. Route Parameters

Express:
```javascript
const { id } = req.params;
```

Next.js:
```typescript
const { id } = await params;
```

### 10. Testing

Test each converted route:
```bash
# Example for auth/login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Example for protected route
curl -X GET http://localhost:3000/api/jobs/recruiter \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 11. Deployment

After migration:

**Vercel** (recommended):
```bash
vercel
```

**Other platforms**:
```bash
npm run build
npm run start
```

No custom server configuration needed!

## Common Pitfalls

1. **File Uploads**: Use `parseFormData` utility instead of multer
2. **Async Params**: Always `await params` in Next.js 15+
3. **Error Handling**: Wrap all routes with `handleRouteError`
4. **Auth**: Use `requireAuth()` instead of middleware
5. **Dynamic Routes**: Set `export const dynamic = 'force-dynamic'`

## Benefits After Migration

- ✅ Simpler deployment (no custom server)
- ✅ Better Vercel integration
- ✅ Native Next.js middleware support
- ✅ Edge runtime support (future)
- ✅ Automatic code splitting
- ✅ Better TypeScript support
- ✅ Fewer dependencies
- ✅ Standard Next.js patterns

## Need Help?

Each Express controller contains business logic that needs to be moved into the Next.js route handlers. The logic itself doesn't change - only the request/response handling and middleware patterns change.

Keep `server/models`, `server/utils`, and `server/db` - these can be imported directly by Next.js routes.
