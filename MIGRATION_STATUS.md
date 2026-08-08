# Express to Next.js Migration Status

## 🎯 Goal
Convert TalentBridge from Express + Next.js hybrid to **pure Next.js API routes only**.

## ✅ Completed Work

### 1. Helper Utilities Created
- ✅ `src/lib/auth.ts` - JWT verification, token signing, auth middleware replacement
- ✅ `src/lib/api-response.ts` - Standard JSON responses, error handling
- ✅ `src/lib/file-upload.ts` - Multipart form data parsing (replaces multer)

### 2. Converted API Routes

#### Auth Routes (6/6) ✅
- ✅ POST `/api/auth/register`
- ✅ POST `/api/auth/login`
- ✅ POST `/api/auth/google`
- ✅ POST `/api/auth/oauth`
- ✅ GET `/api/auth/session`
- ✅ POST `/api/auth/refresh-google-token`

#### Jobs Routes (6/6) ✅
- ✅ GET `/api/jobs` (public)
- ✅ POST `/api/jobs/create` (protected)
- ✅ GET `/api/jobs/recruiter` (protected)
- ✅ POST `/api/jobs/semantic-search` (protected)
- ✅ GET `/api/jobs/[id]`
- ✅ DELETE `/api/jobs/[id]` (protected)

### 3. Package.json Updated
- ✅ Added new scripts: `dev` (Next.js only) and `start` (Next.js only)
- ✅ Kept old scripts as `dev:old` and `start:old` for testing

## 🔄 Remaining Work

### Routes to Convert (10 modules, ~50+ endpoints)

1. **Applications** (8 endpoints, high priority)
   - POST `/api/applications/apply` (with file upload)
   - GET `/api/applications/my-applications`
   - GET `/api/applications/recruiter`
   - GET `/api/applications/job/:jobId`
   - PUT `/api/applications/:id/status`
   - PUT `/api/applications/bulk/status`

2. **Messages** (5 endpoints)
   - POST `/api/messages`
   - GET `/api/messages/conversations`
   - GET `/api/messages/:candidateId`
   - GET `/api/messages/conversation/:applicationId`
   - PUT `/api/messages/:messageId/read`

3. **Resume** (3 endpoints with file upload)
   - POST `/api/resume/upload`
   - GET `/api/resume`
   - DELETE `/api/resume`

4. **Evaluation** (check `server/routes/evaluation.js`)

5. **RAG Search** (check `server/routes/ragSearch.js`)

6. **ATS** (check `server/routes/ats.js`)

7. **Offers** (check `server/routes/offers.js`)

8. **OA (Online Assessment)** (check `server/routes/oa.js`)

9. **Candidate** (check `server/routes/candidate.js`)

10. **Recruiter** (check `server/routes/recruiter.js`)

## 📋 Next Steps

### Immediate
1. Convert remaining routes using the patterns established
2. Test each route as you convert it
3. Keep `server/models`, `server/utils`, `server/db` (used by Next.js routes)

### After All Routes Converted
1. Remove Express dependencies from package.json:
   - `express`
   - `cors`
   - `multer`
2. Delete obsolete files:
   - `server.js` (custom Next server)
   - `server/server.js` (Express server)
   - `src/app/api/[...path]/route.ts` (Express proxy)
   - `server/routes/*` (converted to Next.js)
   - `server/controllers/*` (logic moved to Next.js routes)
   - `server/middleware/*` (replaced by utilities)

### Testing
1. Test with Next.js dev server: `npm run dev`
2. Test all API endpoints
3. Test file uploads
4. Test authentication flows
5. Test protected routes

### Deployment
1. Deploy to Vercel (recommended) or
2. Use standard Next.js deployment: `npm run build && npm run start`

## 📁 Files Created

### Utilities
- `src/lib/auth.ts`
- `src/lib/api-response.ts`
- `src/lib/file-upload.ts`

### API Routes
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/google/route.ts`
- `src/app/api/auth/oauth/route.ts`
- `src/app/api/auth/session/route.ts`
- `src/app/api/auth/refresh-google-token/route.ts`
- `src/app/api/jobs/route.ts`
- `src/app/api/jobs/create/route.ts`
- `src/app/api/jobs/recruiter/route.ts`
- `src/app/api/jobs/semantic-search/route.ts`
- `src/app/api/jobs/[id]/route.ts`

### Documentation
- `MIGRATION_TO_NEXTJS_ONLY.md`
- `NEXTJS_MIGRATION_GUIDE.md`
- `MIGRATION_STATUS.md` (this file)

## 🧪 How to Test Current Progress

### Test Next.js-only mode
```bash
npm run dev
```

### Test auth endpoints
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","fullName":"Test User","userType":"candidate"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'
```

### Test jobs endpoints
```bash
# Get all jobs (public)
curl http://localhost:3000/api/jobs

# Create job (protected - need token)
curl -X POST http://localhost:3000/api/jobs/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Software Engineer","company":"TechCorp","location":"Remote","type":"full-time","description":"Great job"}'
```

## 🎓 Migration Patterns Reference

### Auth Pattern
```typescript
import { requireAuth, getUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request);
    const userId = getUserId(decoded);
    // Your logic
  });
}
```

### File Upload Pattern
```typescript
import { parseFormData, validateFile } from '@/lib/file-upload';

export async function POST(request: NextRequest) {
  return handleRouteError(async () => {
    const { fields, files } = await parseFormData(request);
    const file = files['fieldname'];
    
    const validation = validateFile(file, {
      maxSize: 5 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf']
    });
    
    if (!validation.valid) {
      return errorResponse(validation.error!, 400);
    }
    
    // Use file.buffer
  });
}
```

### Dynamic Route Pattern
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRouteError(async () => {
    const { id } = await params;
    // Your logic
  });
}
```

## 💡 Key Benefits

After complete migration:
- ✅ No custom server needed
- ✅ Simpler deployment
- ✅ Better Vercel integration  
- ✅ Standard Next.js patterns
- ✅ Fewer dependencies
- ✅ Better TypeScript support
- ✅ Native Next.js middleware

## 📞 Current State

**You can now run the app in Next.js-only mode** with `npm run dev`. Auth and Jobs routes work!

To complete the migration, continue converting the remaining route files following the same patterns shown in the converted routes.
