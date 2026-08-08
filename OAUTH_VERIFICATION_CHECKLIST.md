# Google OAuth Verification Checklist

Use this checklist to verify that Google OAuth is properly configured and working.

## 1. Google Cloud Console Configuration

### APIs Enabled
- [ ] **Google+ API** is enabled
  - Go to: APIs & Services > Library > Search "Google+ API" > Enable
- [ ] **Google Calendar API** is enabled
  - Go to: APIs & Services > Library > Search "Google Calendar API" > Enable

### OAuth Consent Screen
- [ ] Consent screen is configured (External or Internal)
- [ ] App name is set (e.g., "TalentBridge")
- [ ] Support email is set
- [ ] Developer contact email is set
- [ ] The following scopes are added:
  - [ ] `openid`
  - [ ] `email` 
  - [ ] `profile`
  - [ ] `https://www.googleapis.com/auth/calendar`
- [ ] Test users are added (if app is not published)

### OAuth Credentials
- [ ] OAuth 2.0 Client ID is created (Web application)
- [ ] **Authorized JavaScript origins** include:
  - [ ] `http://localhost:5000` (development)
  - [ ] Your production domain (e.g., `https://talentbridge.com`)
- [ ] **Authorized redirect URIs** include:
  - [ ] `http://localhost:5000/auth/oauth-callback` (development)
  - [ ] Your production callback URL (e.g., `https://talentbridge.com/auth/oauth-callback`)

## 2. Environment Variables

### Root `.env` file
- [ ] `GOOGLE_CLIENT_ID` is set (should end with `.apps.googleusercontent.com`)
- [ ] `GOOGLE_CLIENT_SECRET` is set
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set (same as `GOOGLE_CLIENT_ID`)
- [ ] `GOOGLE_CALENDAR_TIMEZONE` is set (optional, e.g., `America/New_York`)
- [ ] No placeholder values like "your-google-client-id" remain

### `server/.env` file  
- [ ] `GOOGLE_CLIENT_ID` is set (same as root `.env`)
- [ ] `GOOGLE_CLIENT_SECRET` is set (same as root `.env`)
- [ ] `GOOGLE_CALENDAR_TIMEZONE` is set (optional)

### Verify Variables Are Loaded
Run these commands to check:

```bash
# From project root
echo $NEXT_PUBLIC_GOOGLE_CLIENT_ID

# From server directory
cd server
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
```

## 3. Code Verification

### Frontend - GoogleSignInButton.tsx
- [ ] `access_type: 'offline'` is present in OAuth URL
- [ ] `prompt: 'consent'` is present in OAuth URL
- [ ] Scope includes: `'openid email profile https://www.googleapis.com/auth/calendar'`
- [ ] Client ID validation checks for placeholder values

### Frontend - OAuthCallback.tsx
- [ ] Handles warning messages from backend
- [ ] Shows appropriate error messages for common failures
- [ ] Has timeout protection (60 seconds)

### Backend - authController.js
- [ ] Validates access token is present
- [ ] Stores both access token and refresh token
- [ ] Returns warning if refresh token is missing
- [ ] Handles token exchange errors gracefully

### Backend - googleCalendar.js
- [ ] Checks token expiry before using
- [ ] Automatically refreshes expired tokens
- [ ] Provides actionable error messages
- [ ] Logs detailed error information

## 4. Database Schema

- [ ] `users` table has `google_data` column (JSONB)
- [ ] `google_data` structure includes:
  - [ ] `access_token` (string)
  - [ ] `refresh_token` (string)
  - [ ] `scope` (string)
  - [ ] `token_expiry` (timestamp)

## 5. Functional Testing

### Test Sign-In (New User)
- [ ] Click "Sign in with Google" button
- [ ] Redirected to Google consent screen
- [ ] See all requested scopes (profile, email, calendar)
- [ ] Grant permissions
- [ ] Redirected back to dashboard
- [ ] No errors in browser console
- [ ] No errors in server logs

### Verify Token Storage
Check the database after sign-in:
- [ ] User record exists
- [ ] `google_data` field is populated
- [ ] `access_token` exists and is not empty
- [ ] `refresh_token` exists and is not empty ⚠️ **CRITICAL**
- [ ] `scope` includes calendar scope
- [ ] `token_expiry` is a future timestamp

### Test Sign-In (Existing User)
- [ ] Sign out from TalentBridge
- [ ] Sign in again with same Google account
- [ ] Consent screen appears again (due to `prompt=consent`)
- [ ] After granting permissions, signed in successfully
- [ ] Tokens are updated in database

### Test Calendar Integration
- [ ] Create a job posting (as recruiter)
- [ ] Apply to job (as candidate)
- [ ] Schedule an interview
- [ ] Check that calendar event is created
- [ ] Event appears in Google Calendar
- [ ] Both attendees are added
- [ ] Google Meet link is created (for video interviews)
- [ ] Email notifications sent by Google

### Test Token Refresh
**Option A: Wait for expiration (slow)**
- [ ] Wait 1+ hour after sign-in
- [ ] Try to create a calendar event
- [ ] Event is created successfully (token auto-refreshed)
- [ ] No error messages shown to user

**Option B: Force expiration (fast)**
- [ ] Manually set `token_expiry` to past date in database
- [ ] Try to create a calendar event
- [ ] System automatically refreshes token
- [ ] Event is created successfully
- [ ] Database shows updated `access_token` and `token_expiry`

### Test Error Handling
- [ ] Revoke access at https://myaccount.google.com/permissions
- [ ] Try to create a calendar event
- [ ] See error: "needs to reconnect their Google account"
- [ ] Error message includes actionable steps
- [ ] Sign in again with Google to restore access

### Test Edge Cases
- [ ] Sign in, then clear browser cookies, still authenticated on refresh (JWT in localStorage)
- [ ] Sign in with different Google account, creates separate user
- [ ] Sign in as candidate, then as recruiter with same email (should use same user account)
- [ ] Cancel Google consent screen (should redirect back with error)
- [ ] Disconnect from Google mid-session (subsequent calendar calls should fail gracefully)

## 6. Security Verification

- [ ] `GOOGLE_CLIENT_SECRET` is never exposed to frontend
- [ ] `GOOGLE_CLIENT_SECRET` is not in client-side JavaScript bundles
- [ ] Refresh tokens are only stored in database (never sent to frontend)
- [ ] Access tokens are never logged in plain text
- [ ] ID tokens are verified on backend before trusting user info
- [ ] Production uses HTTPS for redirect URIs
- [ ] JWT tokens have reasonable expiration (7 days)

## 7. Production Verification

### Pre-Deployment
- [ ] All environment variables are set in production environment
- [ ] Production redirect URIs are added to Google Cloud Console
- [ ] Production domain uses HTTPS
- [ ] SSL certificate is valid
- [ ] DNS is properly configured

### Post-Deployment
- [ ] Test sign-in flow from production URL
- [ ] Check production server logs for OAuth errors
- [ ] Verify calendar events are created in production
- [ ] Test from multiple devices/browsers
- [ ] Have real users test the flow
- [ ] Monitor error rates for OAuth endpoints

## 8. Monitoring & Maintenance

### Set Up Monitoring
- [ ] Log all OAuth failures
- [ ] Alert on high OAuth error rates
- [ ] Track token refresh success rates
- [ ] Monitor Calendar API quota usage

### Regular Checks
- [ ] Check Google Cloud Console for API errors
- [ ] Review OAuth error logs weekly
- [ ] Verify Calendar API is within quota limits
- [ ] Update OAuth credentials before expiration

### User Support
- [ ] Document how users can reconnect Google account
- [ ] Create support article for "Calendar not connected" errors
- [ ] Have process for revoking compromised tokens
- [ ] Train support team on OAuth troubleshooting

## Common Issues & Solutions

| Issue | Check | Solution |
|-------|-------|----------|
| "OAuth is not configured" | Environment variables | Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set and loaded |
| "Redirect URI mismatch" | Google Console | Add exact redirect URI to authorized list |
| "Calendar not connected" | Database | Check if `refresh_token` exists in `google_data` |
| No refresh token in DB | OAuth flow | Verify `access_type=offline` and `prompt=consent` |
| Token refresh fails | Credentials | Verify `GOOGLE_CLIENT_SECRET` matches Console |
| Calendar API errors | Google Console | Check if Calendar API is enabled |
| "Invalid client" | Credentials | Verify Client ID and Secret are correct |
| Events not showing calendar scope | OAuth consent | Add Calendar scope to consent screen |

## Quick Diagnostic Commands

### Check Environment Variables
```bash
# Frontend
echo $NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Backend  
cd server
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
```

### Check Database
```javascript
// Connect to your database
// For MongoDB/Supabase, run:
db.users.findOne({ email: "test@example.com" }, { google_data: 1 })

// Should return:
{
  google_data: {
    access_token: "ya29...",  // Present
    refresh_token: "1//0g...", // MUST be present
    scope: "openid email profile https://www.googleapis.com/auth/calendar",
    token_expiry: "2026-08-08T13:00:00Z"
  }
}
```

### Test Token Endpoint
```bash
curl -X POST http://localhost:5000/api/auth/oauth \
  -H "Content-Type: application/json" \
  -d '{"code":"test","redirectUri":"http://localhost:5000/auth/oauth-callback"}'
```

### Check Google Cloud Console
```
https://console.cloud.google.com/apis/credentials
https://console.cloud.google.com/apis/api/calendar-json.googleapis.com
https://console.cloud.google.com/apis/api/plus.googleapis.com
```

## Success Criteria

✅ All checklist items are completed  
✅ Users can sign in with Google  
✅ Refresh tokens are stored in database  
✅ Calendar events are created successfully  
✅ Tokens refresh automatically after expiration  
✅ Error messages are clear and actionable  
✅ No OAuth errors in production logs  

## Next Steps After Verification

1. Mark this checklist as complete
2. Archive for future reference
3. Set up ongoing monitoring
4. Document any custom configurations
5. Train team on OAuth troubleshooting

---

**Last Updated**: August 8, 2026  
**Verified By**: _____________  
**Production Ready**: [ ] Yes [ ] No
