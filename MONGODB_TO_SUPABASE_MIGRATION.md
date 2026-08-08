# MongoDB to Supabase Migration Guide

## Migration Status: IN PROGRESS ⚠️

This document tracks the complete migration from MongoDB/Mongoose to Supabase/PostgreSQL.

---

## Changes Completed ✅

### 1. Server Configuration
**File**: `server/server.js`
- ✅ Removed MongoDB connection code
- ✅ Added Supabase connection verification
- ✅ Updated health check message

### 2. Package Dependencies
**File**: `server/package.json`
- ✅ Removed `mongoose` dependency
- ✅ Added `@supabase/supabase-js` (was already present)
- ✅ All other dependencies remain unchanged

### 3. Environment Variables
**File**: `server/.env.example`
- ✅ Removed `MONGODB_URI`
- ✅ Added `SUPABASE_URL`
- ✅ Added `SUPABASE_SERVICE_ROLE_KEY`

### 4. Mongoose Compatibility Layer
**File**: `server/utils/mongooseCompat.js` (NEW)
- ✅ Created compatibility helpers for Mongoose methods
- ✅ Added `mongoose.Types.ObjectId.isValid()` replacement
- ✅ Added `populate()` helper (simplified implementation)

### 5. Controller Updates - Simple Fixes
- ✅ `authController.js` - Removed `.lean()` calls
- ✅ `applicationController.js` - Updated mongoose import
- ✅ `messageController.js` - Updated mongoose import

---

## Changes Remaining TODO

### Controllers with `.populate()` calls

These files need manual updates to handle data joins without Mongoose:

#### 1. **applicationController.js**
**Lines to fix**:
- Line ~117: `.populate("jobId", "title company location type id")`
- Line ~118: `.populate("recruiterId", "fullName companyName id")`
- Line ~167: `.populate("candidateId", "fullName email phone skills")`
- Line ~167: `.populate("jobId", "title company")`
- Line ~231: `.populate("candidateId", "fullName email phone skills")`
- Line ~279: `.populate("jobId", "title company")`

**Strategy**: Manually fetch related Job/User data after getting applications

#### 2. **offerController.js**
**Lines to fix**:
- Line ~91-92: `.populate("candidateId")` and `.populate("jobId")`
- Line ~151-152: `.populate("candidateId", "fullName email")` and `.populate("applicationId")`
- Line ~189-190: `.populate("recruiterId", "fullName companyName")`
- Line ~221: `.populate("jobId")`
- Line ~279-284: Complex nested populate

**Strategy**: Manually fetch related data in separate queries

#### 3. **oaController.js** (Assessment Controller)
**Lines to fix**:
- Line ~78: `.populate("jobId", "title company")`
- Line ~184: `.populate("applicationId", "status")`
- Line ~465-466: `.populate("candidateId", "fullName email")` and `.populate("applicationId", "status")`
- Line ~473: `.populate("candidateId", "fullName email")`
- Line ~515: `.populate("candidateId", "fullName email")`

**Strategy**: Fetch related data separately

#### 4. **jobController.js**
**Lines to fix**:
- Line ~63: `.populate('recruiter', 'avatarUrl name')`
- Line ~78: `.populate('recruiter', 'avatarUrl name')`
- Line ~80: `.populate('recruiter', 'avatarUrl name')`
- Line ~113: `.populate('recruiter', 'avatarUrl name')`

**Strategy**: Join with users table manually

#### 5. **atsController.js**
**Lines to fix**:
- Line ~40: `.populate("user", "id")`
- Line ~120: `.populate("user", "id")`
- Line ~177: `.populate("user", "id")`
- Line ~257: `.populate("user", "id")`

**Strategy**: These populate "user" from candidates - need to join manually

### Migration Files to Remove/Update

#### Files to DELETE:
- ❌ `server/migrations/migrate_populate_recruiter_refs.js` (MongoDB-specific)
- ❌ `server/migrations/verify_refs.js` (MongoDB-specific)

#### New Migration Strategy:
- Use Supabase SQL migrations in `supabase/migrations/` folder
- Run schema.sql to create tables
- Seed data with modified seed.js script

---

## Mongoose Features to Replace

### 1. `.populate()` → Manual Joins
```javascript
// BEFORE (Mongoose)
const apps = await Application.find({ candidateId })
  .populate("jobId", "title company");

// AFTER (Supabase)
const apps = await Application.find({ candidateId });
for (const app of apps) {
  if (app.jobId) {
    app.jobId = await Job.findById(app.jobId);
  }
}
```

### 2. `.lean()` → Not Needed
```javascript
// BEFORE (Mongoose)
const user = await User.findOne({ id }).lean();

// AFTER (Supabase)
const user = await User.findOne({ id });
// Supabase models already return plain objects
```

### 3. `mongoose.Types.ObjectId.isValid()` → Use Helper
```javascript
// BEFORE
if (mongoose.Types.ObjectId.isValid(id)) { ... }

// AFTER
const { mongoose } = require('../utils/mongooseCompat');
if (mongoose.Types.ObjectId.isValid(id)) { ... }
```

### 4. `.countDocuments()` → Already Supported
```javascript
// Works the same
const count = await User.countDocuments({ userType: 'candidate' });
```

### 5. `.sort()`, `.limit()` → Already Supported
```javascript
// Works the same
const users = await User.find({}).sort({ createdAt: -1 }).limit(10);
```

---

## Database Schema Differences

### MongoDB ObjectId vs Supabase UUID
- **MongoDB**: Uses 24-char hexadecimal ObjectId for `_id`
- **Supabase**: Uses UUID for `id` field
- **Impact**: ID validation logic updated in mongooseCompat.js

### Field Names
- **MongoDB/Mongoose**: Uses both snake_case and camelCase
- **Supabase**: Uses snake_case in database, camelCase in JavaScript
- **Conversion**: Handled automatically by `toSnakeCase()` and `toCamelCase()` in models.js

### Relations
- **MongoDB**: Uses ObjectId references with `.populate()`
- **Supabase**: Uses TEXT/UUID foreign keys, manual joins required
- **Impact**: Need to manually fetch related data

---

## Migration Steps

### Step 1: Environment Setup ✅
1. Set up Supabase project
2. Run `supabase/schema.sql` to create tables
3. Update environment variables
4. Remove MongoDB connection

### Step 2: Code Updates (IN PROGRESS)
1. ✅ Update server.js
2. ✅ Remove mongoose from package.json
3. ✅ Create compatibility helpers
4. ⏳ Fix controllers with .populate()
5. ⏳ Remove MongoDB migration files
6. ⏳ Update seed script for Supabase

### Step 3: Testing
1. Test all API endpoints
2. Verify data relationships work
3. Test OAuth flow
4. Test file uploads
5. Test real-time messaging

### Step 4: Deployment
1. Deploy Supabase schema
2. Migrate existing data (if any)
3. Update production environment variables
4. Deploy updated code

---

## Quick Fix Guide

### For Controllers with `.populate()`

**Pattern to follow**:

```javascript
// 1. Fetch main data
const applications = await Application.find({ recruiterId });

// 2. Manually fetch related data
for (const app of applications) {
  // Fetch jobId data
  if (app.jobId) {
    const job = await Job.findById(app.jobId);
    if (job) {
      // Only include requested fields
      app.jobId = {
        id: job.id,
        title: job.title,
        company: job.company
      };
    }
  }
  
  // Fetch candidateId data
  if (app.candidateId) {
    const candidate = await User.findById(app.candidateId);
    if (candidate) {
      app.candidateId = {
        id: candidate.id,
        fullName: candidate.fullName,
        email: candidate.email
      };
    }
  }
}
```

---

## Benefits of Supabase Migration

### ✅ Advantages
1. **PostgreSQL**: More powerful querying, better for complex analytics
2. **pgvector**: Built-in vector search for embeddings
3. **Real-time**: Built-in real-time subscriptions
4. **Auto-generated APIs**: REST and GraphQL APIs out of the box
5. **Row Level Security**: Better security model
6. **Better Joins**: Native SQL joins vs manual population
7. **Type Safety**: Better TypeScript support
8. **Scalability**: Managed PostgreSQL scales better

### ⚠️ Trade-offs
1. **More Manual Work**: No automatic population
2. **Learning Curve**: Team needs to learn PostgreSQL
3. **Migration Effort**: Need to rewrite populate logic

---

## Testing Checklist

After completing migration:

- [ ] User registration works (email + OAuth)
- [ ] User login works
- [ ] Candidate profile CRUD
- [ ] Recruiter profile CRUD
- [ ] Job posting CRUD
- [ ] Job applications work
- [ ] Application status updates
- [ ] Offer creation and management
- [ ] Messaging works
- [ ] Resume upload and parsing
- [ ] Assessments work
- [ ] Calendar integration
- [ ] Semantic search works
- [ ] RAG search works
- [ ] ATS features work

---

## Rollback Plan

If issues occur:

1. **Keep MongoDB credentials** in environment for quick rollback
2. **Git branch**: Keep MongoDB code in separate branch
3. **Gradual migration**: Can run both databases temporarily
4. **Feature flags**: Toggle between MongoDB and Supabase per feature

---

## Next Steps

1. **Fix remaining .populate() calls** in controllers
2. **Test each controller** as it's fixed
3. **Update seed script** for Supabase
4. **Run full test suite**
5. **Deploy to staging**
6. **Production migration**

---

**Status**: 40% Complete  
**Blockers**: Need to fix .populate() calls in 5 controllers  
**ETA**: 2-3 hours of focused work  
**Risk Level**: Medium (well-defined changes, good test coverage needed)
