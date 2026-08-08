# Database Schema Fix Report

## Issue Found

**Error**: "Could not find the 'user' column of 'candidates' in the schema cache"

## Root Cause

The codebase has a **critical inconsistency** between code and database schema:

### What the Code Was Using:
- JavaScript code creates Candidate/Recruiter with field: `user:` 
- This gets converted to `user` column in database (no conversion)

### What the Database Actually Has:
- Database schema (Supabase/PostgreSQL) uses column: `user_id`
- The conversion function `toSnakeCase()` converts `userId` → `user_id` ✅
- But `user` stays as `user` ❌

## Database Architecture Analysis

The project has a **mixed database setup**:

1. **server.js**: Connects to MongoDB via Mongoose
2. **db/models.js**: Provides Supabase-compatible model layer
3. **supabase/schema.sql**: PostgreSQL schema for Supabase

This suggests the project is **transitioning from MongoDB to Supabase** or supports both.

## Fixes Applied

### 1. Auth Controller (3 locations)
**File**: `server/controllers/authController.js`

**Changed**:
```javascript
// BEFORE (Wrong - creates 'user' field)
new Candidate({ user: user._id || user.id, userId: user.id, ... })
new Recruiter({ user: user._id || user.id, userId: user.id, ... })

// AFTER (Correct - creates 'userId' field which converts to 'user_id')
new Candidate({ userId: user.id, ... })
new Recruiter({ userId: user.id, ... })
```

**Changed**:
```javascript
// BEFORE (Wrong - queries 'user' field)
Candidate.findOne({ user: user._id })
Recruiter.findOne({ user: user._id })

// AFTER (Correct - queries 'userId' field which converts to 'user_id')
Candidate.findOne({ userId: user.id })
Recruiter.findOne({ userId: user.id })
```

### 2. Resume Controller
**File**: `server/controllers/resumeController.js`

**Function**: `getCandidateContext`

**Changed**:
```javascript
// BEFORE
let candidate = await Candidate.findOne({ user: user._id });
candidate = await Candidate.create({ user: user._id, ... });

// AFTER
let candidate = await Candidate.findOne({ userId: user.id });
candidate = await Candidate.create({ userId: user.id, ... });
```

### 3. Candidate Controller
**File**: `server/controllers/candidateController.js`

**Functions**: `ensureCandidateProfile`, `getProfileById`

**Changed**:
```javascript
// BEFORE
let profile = await Candidate.findOne({ user: user._id });
profile = await Candidate.create({ user: user._id, ... });

// AFTER
let profile = await Candidate.findOne({ userId: user.id });
profile = await Candidate.create({ userId: user.id, ... });
```

### 4. Recruiter Controller
**File**: `server/controllers/recruiterController.js`

**Function**: `ensureRecruiterProfile`

**Changed**:
```javascript
// BEFORE
let profile = await Recruiter.findOne({ user: user._id });
profile = await Recruiter.create({ user: user._id, ... });

// AFTER
let profile = await Recruiter.findOne({ userId: user.id });
profile = await Recruiter.create({ userId: user.id, ... });
```

## Database Schema Reference

### Supabase/PostgreSQL Schema

```sql
-- Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,  -- ✅ Correct
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    ...
);

-- Recruiters Table
CREATE TABLE IF NOT EXISTS recruiters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,  -- ✅ Correct
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    ...
);
```

### Conversion Logic

From `db/models.js`:

```javascript
// camelCase JS → snake_case DB
function toSnakeCase(obj) {
    for (const key of Object.keys(obj)) {
        let snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        row[snakeKey] = obj[key];
    }
}

// Examples:
userId  → user_id  ✅ Correct
user    → user     ❌ Wrong (should be user_id)
```

## Migration Files Status

**Files**: 
- `server/migrations/migrate_populate_recruiter_refs.js`
- `server/migrations/verify_refs.js`

**Status**: ⚠️ These migrations still reference the `user` field

**Note**: These appear to be MongoDB-specific migration scripts. If the project is using Supabase, these migrations should be updated or replaced with SQL migrations.

**Recommendation**: 
- If using MongoDB: Update these to use `userId` field
- If using Supabase: Create SQL migration scripts instead

## Verification Steps

### 1. Check Database Connection
Verify which database is actually being used:
- MongoDB: Check `MONGODB_URI` environment variable
- Supabase: Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### 2. Test User Creation
```javascript
// Create a test user and candidate
const user = await User.create({ 
    email: 'test@example.com', 
    userType: 'candidate' 
});

const candidate = await Candidate.create({ 
    userId: user.id,  // ✅ This should work now
    name: 'Test User',
    email: 'test@example.com'
});

// Query should work
const found = await Candidate.findOne({ userId: user.id });
console.log('Found:', found); // Should return the candidate
```

### 3. Check Database Schema
**For Supabase**:
```sql
-- Verify the column name
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'candidates' AND column_name LIKE '%user%';

-- Should return: user_id | text
```

**For MongoDB**:
```javascript
// Check a sample document
db.candidates.findOne();
// Should have: userId field (converted to user_id in Supabase)
```

## Files Modified Summary

| File | Changes | Status |
|------|---------|--------|
| `server/controllers/authController.js` | 3 locations fixed | ✅ Complete |
| `server/controllers/resumeController.js` | 1 function fixed | ✅ Complete |
| `server/controllers/candidateController.js` | 2 functions fixed | ✅ Complete |
| `server/controllers/recruiterController.js` | 1 function fixed | ✅ Complete |
| `server/migrations/migrate_populate_recruiter_refs.js` | Not fixed | ⚠️ Pending |
| `server/migrations/verify_refs.js` | Not fixed | ⚠️ Pending |

## Expected Results

After these fixes:

1. ✅ Google OAuth sign-in creates Candidate/Recruiter profiles successfully
2. ✅ Profile queries work correctly  
3. ✅ Resume upload links to correct candidate
4. ✅ No more "Could not find the 'user' column" errors
5. ✅ Database relationships work properly

## Next Steps

1. **Test the fixes** with actual Google OAuth flow
2. **Verify database** to ensure user_id column exists
3. **Decide on migration strategy**:
   - If using MongoDB: Keep current migration files, update to use `userId`
   - If using Supabase: Create SQL migrations, remove Mongoose migrations
4. **Clean up** any existing data with incorrect `user` field
5. **Update documentation** to clarify database choice (MongoDB vs Supabase)

## Database Decision Required

The codebase shows signs of supporting both MongoDB and Supabase. **You need to decide**:

### Option A: Use Supabase (Recommended)
- ✅ Modern PostgreSQL with vector support
- ✅ Built-in authentication
- ✅ Automatic API generation
- ✅ Real-time subscriptions
- ❌ Requires SQL migration scripts
- ❌ Remove Mongoose dependency

### Option B: Use MongoDB
- ✅ Already connected in server.js
- ✅ Flexible schema
- ✅ Existing migrations work
- ❌ Need to add vector search support separately
- ❌ More manual work for embeddings

### Option C: Hybrid (Current State)
- ⚠️ Most complex
- ⚠️ Requires maintaining both
- ⚠️ Schema must stay in sync
- ✅ Can migrate gradually

## Recommendation

Based on the code structure and the presence of:
- Vector embeddings for semantic search
- Supabase schema with pgvector extension
- Modern TypeScript frontend

**Recommendation**: **Fully migrate to Supabase** and remove MongoDB/Mongoose dependencies.

---

**Status**: Schema fixes applied ✅  
**Next Action**: Test Google OAuth flow  
**Database Decision**: Pending (MongoDB vs Supabase)
