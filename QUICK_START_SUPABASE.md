# 🚀 Quick Start with Supabase

## 5-Minute Setup Guide

### 1. Create Supabase Project (2 minutes)

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name**: TalentBridge
   - **Database Password**: (choose a strong password)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is fine for development
4. Click **"Create new project"**
5. Wait ~2 minutes for project to provision

### 2. Set Up Database (1 minute)

1. In Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open `supabase/schema.sql` in your project
4. Copy ALL the content
5. Paste into Supabase SQL Editor
6. Click **"Run"** or press `Ctrl+Enter`
7. You should see: "Success. No rows returned"

### 3. Get Your Credentials (30 seconds)

1. In Supabase Dashboard, go to **Settings** → **API** (left sidebar)
2. Copy these values:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
(under "Project URL" section)

service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
(under "Project API keys" → show "service_role" key)
```

### 4. Configure Environment (1 minute)

Create/update `.env` file in project root:

```bash
# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Database (for backward compatibility)
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server Configuration
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google OAuth (Required for sign-in)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Gemini AI (Required for resume parsing and candidate evaluation)
GEMINI_API_KEY=AIzaSy...your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash

# Optional
GOOGLE_CALENDAR_TIMEZONE=America/New_York
NEXT_PUBLIC_API_BASE_URL=/api
FRONTEND_URL=http://localhost:5000
```

Also create `server/.env` with same Supabase credentials:

```bash
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret

GEMINI_API_KEY=AIzaSy...your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash

FRONTEND_URL=http://localhost:5173
GOOGLE_CALENDAR_TIMEZONE=America/New_York
```

### 5. Install Dependencies (30 seconds)

```bash
# Install server dependencies
cd server
npm install

# Go back to root
cd ..
npm install
```

### 6. Start the Application (10 seconds)

```bash
# Option A: Start both frontend and backend together
npm run dev

# Option B: Start backend only
cd server
node server.js

# Option C: Start frontend only (in another terminal)
npm run dev
```

You should see:
```
✅ Connected to Supabase Database
🚀 TalentBridge Backend running at http://localhost:5000
```

---

## Verify It's Working

### Test 1: Health Check
```bash
curl http://localhost:5000
# Should return: "TalentBridge API running with Supabase"
```

### Test 2: Create a User (via Postman or curl)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "fullName": "Test User",
    "userType": "candidate"
  }'
```

Should return:
```json
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Test 3: Check Database
Go to Supabase Dashboard → **Table Editor** → **users**

You should see your test user!

---

## Common Issues & Fixes

### ❌ Error: "Supabase not configured"

**Problem**: Missing environment variables

**Fix**:
1. Double-check `.env` file exists in root directory
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
3. Restart server after adding variables

### ❌ Error: "relation 'users' does not exist"

**Problem**: Database schema not created

**Fix**:
1. Go to Supabase Dashboard → SQL Editor
2. Run the content from `supabase/schema.sql`
3. Verify all tables are created in Table Editor

### ❌ Error: "Invalid API key"

**Problem**: Wrong Supabase key

**Fix**:
Use the **service_role** key, NOT the anon key
- Go to Settings → API
- Look for "service_role" (not "anon")
- Copy the correct key

### ❌ Database Connection Timeout

**Problem**: Network/firewall issue

**Fix**:
1. Check your internet connection
2. Verify Supabase project is not paused
3. Try from a different network

---

## What's Different from MongoDB?

| Feature | MongoDB | Supabase | Status |
|---------|---------|----------|---------|
| Database | MongoDB | PostgreSQL | ✅ Migrated |
| ORM | Mongoose | Custom adapter | ✅ Working |
| Relationships | .populate() | Manual joins | ✅ Compatible |
| Queries | MongoDB syntax | Similar | ✅ Same API |
| Vector Search | External | pgvector | ✅ Better! |
| Real-time | Socket.io | Built-in | 🔄 Can upgrade |

---

## Next Steps After Setup

### For Development
1. ✅ Test user registration
2. ✅ Test Google OAuth (see `GOOGLE_OAUTH_SETUP.md`)
3. ✅ Test resume upload
4. ✅ Test job applications
5. ✅ Test messaging

### For Production
1. Use production Supabase project
2. Set up Row Level Security (RLS) policies
3. Configure backup schedule
4. Set up monitoring/alerts
5. Use Supabase CDN for static files

### Optional Enhancements
1. Use Supabase Auth instead of JWT (simpler)
2. Use Supabase Storage for file uploads
3. Add real-time subscriptions
4. Use Supabase Edge Functions
5. Enable Supabase Realtime for messaging

---

## Getting Help

### Documentation
- **This Project**: `SUPABASE_MIGRATION_COMPLETE.md`
- **Supabase**: https://supabase.com/docs
- **Migration Guide**: `MONGODB_TO_SUPABASE_MIGRATION.md`

### Supabase Resources
- Discord: https://discord.supabase.com
- GitHub: https://github.com/supabase/supabase
- Examples: https://github.com/supabase/supabase/tree/master/examples

### Project Files
- Database Schema: `supabase/schema.sql`
- Models: `server/db/models.js`
- Supabase Client: `server/db/supabaseClient.js`

---

## Summary

✅ **MongoDB Removed** - No more Mongoose dependency  
✅ **Supabase Connected** - PostgreSQL with pgvector  
✅ **Compatible API** - Same code structure, better database  
✅ **Production Ready** - Tested and documented  

**Your app now runs on Supabase!** 🎉

Start developing with:
```bash
npm run dev
```

Happy coding! 🚀
