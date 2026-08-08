# Vercel Environment Variables Setup

## Critical: Environment variables must be configured in Vercel Dashboard

Your local `.env` file is **NOT** deployed to Vercel. You must manually add all environment variables in the Vercel dashboard.

### Steps to Configure:

1. Go to https://vercel.com/dashboard
2. Select your project: `TalentBridge`
3. Go to **Settings** → **Environment Variables**
4. Add each variable below for **Production**, **Preview**, and **Development** environments

### Required Environment Variables:

```bash
# Port
PORT=5000

# JWT Secret
JWT_SECRET=talentbridge_secret_jwt_key_2026

# Supabase
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# Pusher
PUSHER_APP_ID=<your-pusher-app-id>
PUSHER_SECRET=<your-pusher-secret>
NEXT_PUBLIC_PUSHER_KEY=<your-pusher-key>
NEXT_PUBLIC_PUSHER_CLUSTER=<your-pusher-cluster>

# API Base
NEXT_PUBLIC_API_BASE_URL=/api

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com

# Gemini AI (CRITICAL FOR RESUME PARSING)
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-1.5-flash

# Frontend URL (update to your Vercel domain)
FRONTEND_URL=https://console-talent-bridge.vercel.app

# Google Calendar
GOOGLE_CALENDAR_TIMEZONE=Asia/Kolkata
```

### After Adding Variables:

1. Click **Save** for each variable
2. Go to **Deployments** tab
3. Click **...** on the latest deployment → **Redeploy** → **Use existing build cache: NO**
4. Wait for deployment to complete (~2 minutes)

### Why Resume Upload Fails:

If `GEMINI_API_KEY` is missing or incorrect in Vercel environment variables, resume parsing will fail with "Resume upload failed" error.

### Verify Environment Variables:

After redeployment, check Vercel deployment logs:
1. Go to Deployments tab
2. Click on the latest deployment
3. Click on **Function Logs** (at runtime when you upload a resume)
4. Look for `[Resume Upload]` and `[Gemini]` log messages

The logs will show if the API key is working or if there are other issues.
