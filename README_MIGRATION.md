# TalentBridge - Express to Next.js Migration

## 🎯 What's Been Done

Your TalentBridge application has been partially migrated from Express + Next.js to **pure Next.js API routes**.

### Completed ✅

1. **Helper Utilities** (3 files)
   - `src/lib/auth.ts` - JWT authentication
   - `src/lib/api-response.ts` - Standard responses  
   - `src/lib/file-upload.ts` - File upload handling

2. **Auth API Routes** (6 endpoints)
   - Register, Login, Google OAuth, Session, Token Refresh

3. **Jobs API Routes** (6 endpoints)
   - CRUD operations, Semantic search, Recruiter jobs

4. **Applications API Routes** (3 endpoints)
   - Apply to job (with file upload)
   - Get candidate applications
   - Get recruiter applications

5. **Documentation**
   - `MIGRATION_STATUS.md` - Current progress
   - `NEXTJS_MIGRATION_GUIDE.md` - Complete guide
   - `MIGRATION_TO_NEXTJS_ONLY.md` - Technical details

## 🚀 How to Use

### Option 1: Run with Next.js Only (New Way)
```bash
npm run dev
```

This now uses pure Next.js without Express. The following routes work:
- ✅ All auth routes (`/api/auth/*`)
- ✅ All jobs routes (`/api/jobs/*`)
- ✅ Some application routes (`/api/applications/*`)

### Option 2: Run with Express (Old Way - Still Available)
```bash
npm run dev:old
```

This runs the original Express + Next.js hybrid setup.

## 📝 What Needs to Be Done

You need to convert the remaining Express routes to Next.js API routes:

### High Priority
1. **Applications** - 5 more endpoints (status updates, bulk operations)
2. **Messages** - 5 endpoints  
3. **Resume** - 3 endpoints with file upload

### Medium Priority
4. **Evaluation** - Check `server/routes/evaluation.js`
5. **RAG Search** - Check `server/routes/ragSearch.js`
6. **ATS** - Check `server/routes/ats.js`

### Lower Priority  
7. **Offers** - Check `server/routes/offers.js`
8. **OA** - Check `server/routes/oa.js`
9. **Candidate** - Check `server/routes/candidate.js`
10. **Recruiter** - Check `server/routes/recruiter.js`

## 📖 How to Convert a Route

Follow this pattern for each Express route:

### 1. Find the Express Route
```javascript
// server/routes/example.js
router.get("/:id", authMiddleware, getExample);
```

### 2. Create Next.js Route File
```typescript
// src/app/api/example/[id]/route.ts
import { NextRequest } from 'next/server';
import { handleRouteError, successResponse } from '@/lib/api-response';
import { requireAuth, getUserId } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRouteError(async () => {
    const decoded = requireAuth(request); // If route needs auth
    const userId = getUserId(decoded);
    const { id } = await params;
    
    // Copy controller logic here
    // Import models: const Model = require('../../../../../server/models/Model');
    
    return successResponse({ data: yourData });
  });
}

export const dynamic = 'force-dynamic';
```

### 3. Handle Different Patterns

**File Upload Route:**
```typescript
import { parseFormData, validateFile } from '@/lib/file-upload';

export async function POST(request: NextRequest) {
  return handleRouteError(async () => {
    const { fields, files } = await parseFormData(request);
    const file = files['fieldName'];
    
    const validation = validateFile(file, {
      maxSize: 5 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf']
    });
    
    if (!validation.valid) {
      return errorResponse(validation.error!, 400);
    }
    
    // Use file.buffer for file data
  });
}
```

**Multiple HTTP Methods:**
```typescript
export async function GET(request: NextRequest) {
  // GET logic
}

export async function POST(request: NextRequest) {
  // POST logic
}

export async function DELETE(request: NextRequest) {
  // DELETE logic
}
```

## 🧪 Testing

Test the converted routes:

```bash
# Test auth
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}'

# Test protected route
curl -X GET http://localhost:3000/api/jobs/recruiter \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📦 After All Routes Are Converted

### 1. Update package.json
Remove Express dependencies:
```json
{
  "dependencies": {
    // Remove:
    // "express": "^5.2.1",
    // "cors": "^2.8.6",
    // "multer": "^2.1.1"
  }
}
```

### 2. Delete Old Files
```bash
rm server.js
rm server/server.js
rm -rf src/app/api/[...path]
rm -rf server/routes
rm -rf server/middleware
```

### 3. Keep These Files
- `server/models/*` - Database models
- `server/utils/*` - Utility functions
- `server/db/*` - Database configuration

These can be imported by Next.js routes!

## 🎁 Benefits of Pure Next.js

- ✅ **Simpler deployment** - No custom server needed
- ✅ **Vercel optimized** - Deploy with `vercel` command
- ✅ **Better DX** - Standard Next.js patterns
- ✅ **Fewer dependencies** - Remove Express, CORS, Multer
- ✅ **TypeScript first** - Full type safety
- ✅ **Future proof** - Can use Edge Runtime later

## 📚 Documentation Files

- **MIGRATION_STATUS.md** - Detailed progress tracking
- **NEXTJS_MIGRATION_GUIDE.md** - Complete conversion guide with examples
- **MIGRATION_TO_NEXTJS_ONLY.md** - Original migration overview
- **README_MIGRATION.md** - This file (quick start guide)

## 💡 Tips

1. Convert routes one at a time and test each
2. Keep `server/models` and `server/utils` - they work with Next.js
3. Use the helper utilities in `src/lib/*`
4. Follow the pattern from already-converted routes
5. Test with `npm run dev` (Next.js only mode)
6. Fall back to `npm run dev:old` if something doesn't work

## 🆘 Need Help?

1. Check `NEXTJS_MIGRATION_GUIDE.md` for detailed patterns
2. Look at already-converted routes for examples:
   - `src/app/api/auth/*` - Authentication examples
   - `src/app/api/jobs/*` - CRUD examples
   - `src/app/api/applications/apply/*` - File upload example
3. All Express controller logic can be copied into Next.js routes
4. Models, utils, and DB code don't need to change!

## 🏁 Final Goal

A pure Next.js application with no Express:
```
src/
  app/
    api/           # All API routes here
  lib/             # Helper utilities
server/
  models/          # Keep - imported by API routes
  utils/           # Keep - imported by API routes
  db/              # Keep - imported by API routes
```

Clean, simple, and fully Next.js! 🎉
