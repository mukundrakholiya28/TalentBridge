# Resume Upload Debugging Guide

## Current Status
Resume upload is failing with HTTP 500 error. The logs should show where exactly it's failing.

## Steps to Debug

### 1. Check Vercel Environment Variables
Go to: https://vercel.com/dashboard → TalentBridge → Settings → Environment Variables

**Required Variables:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `GEMINI_API_KEY` (optional, uses fallback if missing)

### 2. Check Vercel Function Logs
1. Go to Vercel Dashboard → TalentBridge → Deployments
2. Click on latest deployment
3. Go to "Functions" tab
4. Upload a resume
5. Look for logs starting with `[Resume Upload]`

**Expected log flow:**
```
[Resume Upload] ========== NEW UPLOAD REQUEST ==========
[Resume Upload] Request received
[Resume Upload] File present: true
[Resume Upload] User: <user-id>
[Resume Upload] Getting candidate context...
[Resume Upload] Context retrieved successfully
[Resume Upload] File size: <bytes> bytes
[Resume Upload] File mimetype: application/pdf
[Resume Upload] Parsing PDF buffer...
[Resume Upload] PDF parsed successfully
[Resume Upload] Extracted text length: <chars> characters
[Resume Upload] Text formatted and cleaned
[Resume Upload] Using fallback extraction (regex-based)
[Resume Upload] Fallback extraction completed
[Resume Upload] Merging skills...
[Resume Upload] Updating candidate fields...
[Resume Upload] Candidate fields updated
[Resume Upload] Saving candidate to database...
[Resume Upload] Candidate saved successfully
[Resume Upload] Success! Returning candidate profile
```

### 3. Common Failure Points

**A. Authentication Error**
- Log: `ERROR: Context error`
- Fix: Check JWT_SECRET is set in Vercel
- Fix: Make sure Authorization header is being sent

**B. Database Connection Error**
- Log: `Candidate save error`  
- Fix: Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel
- Fix: Verify Supabase project is active

**C. PDF Parsing Error**
- Log: `PDF parsing failed`
- Note: This is non-critical, uses fallback
- If text length is 0, the PDF might be image-based

**D. Memory/Timeout Error**
- Vercel serverless functions have 10s timeout (hobby plan)
- Large PDFs or slow API calls can timeout
- Solution: Reduce PDF size or upgrade Vercel plan

### 4. Manual Test (Local)

Run locally to see full error:

```bash
cd server
npm install
node server.js
```

Then try uploading via the app at http://localhost:5000

### 5. Quick Fixes

**If nothing works, try:**
1. Redeploy without build cache (Deployments → ... → Redeploy → uncheck "Use existing build cache")
2. Check if `USE_SUPABASE=true` is set (if using Supabase)
3. Verify candidate profile exists before uploading

### 6. Fallback: Manual Profile Entry

If upload keeps failing:
1. Click "Edit Details" instead
2. Manually enter profile information
3. Skip the resume upload feature

## Latest Changes

Commit `3bd38d2` added:
- Extensive error logging at every step
- Fallback extraction even if regex fails
- Non-critical embedding/chunk creation
- Clear error messages with context

The upload **should not fail** anymore unless there's a database/auth issue.
