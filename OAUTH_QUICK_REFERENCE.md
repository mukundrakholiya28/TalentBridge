# Google OAuth Quick Reference

Quick reference for developers working with Google OAuth in TalentBridge.

## Essential OAuth Parameters

```javascript
// In GoogleSignInButton.tsx - Authorization URL
{
  client_id: GOOGLE_CLIENT_ID,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'openid email profile https://www.googleapis.com/auth/calendar',
  access_type: 'offline',  // ⚠️ REQUIRED for refresh tokens
  prompt: 'consent',       // ⚠️ REQUIRED to always get refresh tokens
  state: JSON.stringify({ userType, intent })
}
```

## Why These Parameters Matter

| Parameter | Value | Why Critical |
|-----------|-------|--------------|
| `access_type` | `offline` | Without this, Google won't return a refresh token. Users would need to re-authenticate every hour. |
| `prompt` | `consent` | Forces consent screen even for returning users. Google only returns refresh tokens when consent screen is shown. |
| `scope` | Includes `calendar` | Required for calendar API access. Without it, calendar features will fail. |

## Token Lifecycle

```
Sign In
   ↓
Get Authorization Code
   ↓
Exchange for Tokens ────────> Store in Database
   ├─ access_token (expires in ~1 hour)
   ├─ refresh_token (long-lived) ⚠️ CRITICAL
   ├─ id_token (user info)
   └─ expiry_date
   ↓
Use access_token for API calls
   ↓
Token Expires? ──Yes──> Use refresh_token to get new access_token
   ↓ No                      ↓
Continue                 Continue with new token
```

## Environment Variables

### Required (Both Root and Server)
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

### Optional
```bash
NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT=https://yourdomain.com/auth/oauth-callback
GOOGLE_CALENDAR_TIMEZONE=America/New_York
```

## File Locations

| File | Purpose |
|------|---------|
| `src/app/components/GoogleSignInButton.tsx` | Initiates OAuth flow |
| `src/app/pages/OAuthCallback.tsx` | Handles OAuth callback |
| `server/controllers/authController.js` | Exchanges code for tokens |
| `server/utils/googleCalendar.js` | Uses tokens for Calendar API |
| `server/routes/auth.js` | OAuth endpoints |

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/oauth` | POST | Exchange authorization code for tokens |
| `/api/auth/refresh-google-token` | POST | Manually refresh access token |
| `/api/auth/session` | GET | Get current user session |

## Database Schema

```javascript
// users.google_data (JSONB)
{
  access_token: "ya29.a0AfH6SMBx...",    // Short-lived (~1 hour)
  refresh_token: "1//0gL3AE4aMDxx...",   // Long-lived (until revoked)
  scope: "openid email profile https://www.googleapis.com/auth/calendar",
  token_expiry: "2026-08-08T13:00:00.000Z"
}
```

## Common Errors & Quick Fixes

### ❌ "OAuth is not configured"
```bash
# Fix: Set environment variable
export NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### ❌ "Redirect URI mismatch"
```
Fix: Add exact redirect URI to Google Cloud Console:
https://console.cloud.google.com/apis/credentials
→ OAuth 2.0 Client IDs → Edit → Authorized redirect URIs
```

### ❌ "Calendar not connected" / No refresh token
```javascript
// Fix: Ensure OAuth URL has these parameters
access_type: 'offline',
prompt: 'consent'

// User must sign out and sign in again to get refresh token
```

### ❌ Token refresh fails
```bash
# Fix: Verify client secret is correct
echo $GOOGLE_CLIENT_SECRET

# Should match Google Cloud Console
```

### ❌ Calendar API returns 403
```
Fix: Enable Calendar API in Google Cloud Console:
https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
```

## Testing Shortcuts

### Test Sign-In Flow
```
1. Clear cookies/localStorage
2. Go to /candidate/signin or /recruiter/signin
3. Click "Sign in with Google"
4. Grant permissions
5. Should redirect to /candidate/dashboard or /recruiter/dashboard
```

### Check Tokens in Database
```javascript
// Query user by email
SELECT id, email, google_data FROM users WHERE email = 'test@example.com';

// Verify refresh_token exists
// If null, user needs to sign in again
```

### Force Token Refresh
```javascript
// Set token_expiry to past date
UPDATE users 
SET google_data = jsonb_set(
  google_data, 
  '{token_expiry}', 
  '"2020-01-01T00:00:00.000Z"'
) 
WHERE email = 'test@example.com';

// Next calendar operation will trigger refresh
```

### Test Calendar Event Creation
```bash
# Create interview (requires authenticated user)
curl -X POST http://localhost:5000/api/applications/:id/interview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-08-15T10:00:00Z","type":"video"}'
```

## Google Cloud Console Quick Links

| Resource | URL |
|----------|-----|
| Credentials | https://console.cloud.google.com/apis/credentials |
| OAuth Consent Screen | https://console.cloud.google.com/apis/credentials/consent |
| Calendar API | https://console.cloud.google.com/apis/library/calendar-json.googleapis.com |
| API Dashboard | https://console.cloud.google.com/apis/dashboard |
| Quota Monitoring | https://console.cloud.google.com/apis/api/calendar-json.googleapis.com/quotas |

## Code Snippets

### Check if User Has Calendar Access
```javascript
const hasCalendarAccess = (user) => {
  return user?.google?.refreshToken && 
         user?.google?.scope?.includes('calendar');
};
```

### Manually Refresh Token
```javascript
const refreshToken = async (userId) => {
  const response = await fetch('/api/auth/refresh-google-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};
```

### Create Calendar Event (Backend)
```javascript
const { createInterviewEventWithFallback, buildInterviewEvent } = 
  require('./server/utils/googleCalendar');

const event = buildInterviewEvent({
  application,
  candidateUser,
  recruiterUser,
  startDate: new Date('2026-08-15T10:00:00Z'),
  interviewType: 'video'
});

const result = await createInterviewEventWithFallback({
  candidateUser,
  recruiterUser,
  event
});
```

## Debugging Checklist

When OAuth fails, check in this order:

1. ✅ Environment variables are set (`echo $NEXT_PUBLIC_GOOGLE_CLIENT_ID`)
2. ✅ Client ID in frontend matches backend
3. ✅ Redirect URI matches Google Console
4. ✅ Calendar API is enabled
5. ✅ OAuth URL includes `access_type=offline` and `prompt=consent`
6. ✅ User granted all permissions (check scope in database)
7. ✅ Refresh token exists in database
8. ✅ Client secret is correct

## Security Reminders

- ⚠️ Never log refresh tokens or access tokens in plain text
- ⚠️ Never expose `GOOGLE_CLIENT_SECRET` to frontend
- ⚠️ Always use HTTPS in production for redirect URIs
- ⚠️ Verify ID tokens on backend before trusting user info
- ⚠️ Rotate OAuth credentials if compromised

## Support Resources

- 📖 Full Setup Guide: `GOOGLE_OAUTH_SETUP.md`
- 📋 Verification Checklist: `OAUTH_VERIFICATION_CHECKLIST.md`
- 📝 Fixes Summary: `OAUTH_FIXES_SUMMARY.md`
- 🔗 Google Docs: https://developers.google.com/identity/protocols/oauth2

---

**Pro Tip**: Bookmark this file for quick reference during development and debugging!
