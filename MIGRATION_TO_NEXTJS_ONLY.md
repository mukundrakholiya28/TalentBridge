# Migration from Express to Next.js API Routes

## Status: IN PROGRESS

This document tracks the migration from a hybrid Express + Next.js setup to pure Next.js API routes.

## Completed Routes

### Auth Routes ✅
- `POST /api/auth/register` → `src/app/api/auth/register/route.ts`
- `POST /api/auth/login` → `src/app/api/auth/login/route.ts`
- `POST /api/auth/google` → `src/app/api/auth/google/route.ts`
- `POST /api/auth/oauth` → `src/app/api/auth/oauth/route.ts`
- `GET /api/auth/session` → `src/app/api/auth/session/route.ts`
- `POST /api/auth/refresh-google-token` → `src/app/api/auth/refresh-google-token/route.ts`

### Jobs Routes ✅
- `GET /api/jobs` → `src/app/api/jobs/route.ts`
- `POST /api/jobs/create` → `src/app/api/jobs/create/route.ts`
- `GET /api/jobs/recruiter` → `src/app/api/jobs/recruiter/route.ts`
- `POST /api/jobs/semantic-search` → `src/app/api/jobs/semantic-search/route.ts`
- `GET /api/jobs/[id]` → `src/app/api/jobs/[id]/route.ts`
- `DELETE /api/jobs/[id]` → `src/app/api/jobs/[id]/route.ts`

## Remaining Routes to Convert

### Applications Routes 🔄
- `POST /api/applications/apply` (with file upload)
- `POST /api/applications` (alias)
- `GET /api/applications/my-applications`
- `GET /api/applications/candidate` (alias)
- `GET /api/applications/recruiter`
- `GET /api/applications/job/:jobId`
- `PUT /api/applications/bulk/status`
- `PUT /api/applications/:id/status`

### Messages Routes 🔄
- `POST /api/messages`
- `GET /api/messages/conversations`
- `GET /api/messages/:candidateId`
- `GET /api/messages/conversation/:applicationId`
- `PUT /api/messages/:messageId/read`

### Resume Routes 🔄
- `POST /api/resume/upload` (with file upload)
- `GET /api/resume`
- `DELETE /api/resume`
- `POST /api/upload-resume` (legacy endpoint with file upload)

### Evaluation Routes 🔄
- Routes from `server/routes/evaluation.js`

### RAG Search Routes 🔄
- Routes from `server/routes/ragSearch.js`

### ATS Routes 🔄
- Routes from `server/routes/ats.js`

### Offers Routes 🔄
- Routes from `server/routes/offers.js`

### OA (Online Assessment) Routes 🔄
- Routes from `server/routes/oa.js`

### Candidate Routes 🔄
- Routes from `server/routes/candidate.js`

### Recruiter Routes 🔄
- Routes from `server/routes/recruiter.js`

## Helper Utilities Created

- `src/lib/auth.ts` - JWT authentication utilities
- `src/lib/api-response.ts` - Standard response helpers

## File Upload Handling

Next.js API routes handle file uploads differently from Express/Multer. Options:
1. Use `request.formData()` for multipart uploads
2. Use `request.arrayBuffer()` for binary data
3. Consider a dedicated file upload service

## Next Steps

1. Convert all remaining Express routes to Next.js API routes
2. Update `package.json` scripts to remove Express dependency
3. Remove custom `server.js` files
4. Remove `src/app/api/[...path]/route.ts` catch-all proxy
5. Test all API endpoints
6. Update deployment configuration

## Package.json Changes Needed

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "seed": "node server/seed.js"
  }
}
```

Remove Express dependencies:
- `express`
- `cors` (use Next.js middleware instead)
- `multer` (use native Next.js form data handling)

## Environment Variables

No changes needed - all existing environment variables work with Next.js API routes.

## Deployment

After migration:
- Vercel: Zero-config deployment
- Other platforms: Use `next start` after `next build`
- No need for custom server or Node.js HTTP server
