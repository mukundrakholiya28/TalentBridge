# Google OAuth Setup Guide

This guide explains how to configure Google OAuth for TalentBridge, including authentication and Google Calendar integration.

## Overview

TalentBridge uses Google OAuth 2.0 with the Authorization Code Flow to:
- Authenticate users (candidates and recruiters)
- Access Google Calendar API for scheduling interviews and assessments
- Obtain refresh tokens for long-term calendar access

## Prerequisites

1. A Google Cloud Project
2. OAuth 2.0 credentials configured
3. Required APIs enabled

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Required APIs

1. Navigate to **APIs & Services > Library**
2. Enable the following APIs:
   - **Google+ API** (for user authentication)
   - **Google Calendar API** (for calendar integration)

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type (or Internal if using Google Workspace)
3. Fill in the required fields:
   - **App name**: TalentBridge
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add the following scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar`
5. Add test users (if app is not published)
6. Save and continue

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: TalentBridge Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5000` (development)
     - `https://yourdomain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:5000/auth/oauth-callback` (development)
     - `https://yourdomain.com/auth/oauth-callback` (production)
5. Click **Create**
6. Copy your **Client ID** and **Client Secret**

## Step 5: Configure Environment Variables

### Root `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Optional: Override OAuth redirect URI (defaults to /auth/oauth-callback)
# NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT=https://yourdomain.com/auth/oauth-callback

# Google Calendar
GOOGLE_CALENDAR_TIMEZONE=America/New_York
```

### `server/.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google Calendar (optional)
GOOGLE_CALENDAR_TIMEZONE=America/New_York
```

## How It Works

### Authentication Flow

1. **User clicks "Sign in with Google"**
   - Frontend redirects to Google OAuth with:
     - `scope`: `openid email profile https://www.googleapis.com/auth/calendar`
     - `access_type`: `offline` (to get refresh token)
     - `prompt`: `consent` (to force consent screen and get refresh token)

2. **User grants permissions**
   - Google redirects back to `/auth/oauth-callback` with authorization code

3. **Frontend exchanges code for tokens**
   - Posts code to backend `/api/auth/oauth`
   - Backend exchanges code for:
     - `access_token` (short-lived, ~1 hour)
     - `refresh_token` (long-lived, used to get new access tokens)
     - `id_token` (contains user info)

4. **Backend creates/updates user**
   - Verifies ID token
   - Creates user account if new
   - Stores Google tokens in database
   - Returns JWT for app authentication

5. **Calendar Integration**
   - When creating calendar events, system:
     - Checks if access token is still valid
     - If expired, uses refresh token to get new access token
     - Makes Calendar API request with fresh token

### Key Features

✅ **Automatic token refresh**: Access tokens are refreshed automatically when expired  
✅ **Offline access**: Refresh tokens allow calendar access even when user is not online  
✅ **Fallback strategy**: If candidate's calendar fails, uses recruiter's calendar  
✅ **Error handling**: Clear error messages guide users to reconnect if needed  
✅ **Meet integration**: Automatically creates Google Meet links for video interviews

## Scopes Explained

- `openid` - Required for OpenID Connect authentication
- `email` - Access to user's email address
- `profile` - Access to user's basic profile info (name, picture)
- `https://www.googleapis.com/auth/calendar` - Full access to Google Calendar (required for creating events with attendees)

## Important OAuth Parameters

### `access_type=offline`
**Critical**: This parameter is required to receive a refresh token. Without it, you only get an access token that expires in ~1 hour, and users would need to re-authenticate frequently.

### `prompt=consent`
**Important**: Forces the consent screen to appear even for returning users. Google only returns a refresh token when the consent screen is shown. For returning users, Google skips the consent screen by default (since they already consented), which means no refresh token is returned. Using `prompt=consent` ensures refresh tokens are always obtained.

### Alternative: `prompt=select_account`
If you prefer a better UX for returning users, use `prompt=select_account` but warn users they may need to reconnect for calendar features if the refresh token expires.

## Troubleshooting

### Users not getting refresh tokens

**Symptoms**: Calendar features work initially but stop after ~1 hour

**Solutions**:
1. Check that `access_type=offline` is in the OAuth URL
2. Check that `prompt=consent` is set (or use `prompt=select_account` for first-time users)
3. Have users revoke access at https://myaccount.google.com/permissions and sign in again
4. Check that Calendar API is enabled in Google Cloud Console

### "Calendar not connected" errors

**Symptoms**: Error says "needs to reconnect their Google account"

**Solutions**:
1. User needs to sign out and sign in again with Google
2. Check that refresh token was saved in database (check `users.google_data` field)
3. Verify GOOGLE_CLIENT_SECRET is correct in server environment

### "Invalid client" errors

**Symptoms**: OAuth exchange fails with "invalid_client"

**Solutions**:
1. Verify `GOOGLE_CLIENT_ID` matches in both frontend and backend
2. Verify `GOOGLE_CLIENT_SECRET` is correct
3. Check that redirect URI exactly matches what's configured in Google Cloud Console
4. Ensure there are no trailing slashes or typos in redirect URI

### "Redirect URI mismatch" errors

**Symptoms**: Google shows error about redirect URI not matching

**Solutions**:
1. Add the exact redirect URI to Google Cloud Console
2. Check that `NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT` matches (if set)
3. Remember to add URIs for both development and production environments

## Security Considerations

1. **Never expose Client Secret**: Only use `GOOGLE_CLIENT_SECRET` on backend
2. **Use HTTPS in production**: OAuth requires HTTPS for production redirect URIs
3. **Validate tokens**: Backend always verifies ID tokens before trusting user info
4. **Store tokens securely**: Refresh tokens are sensitive, stored in database only
5. **Rotate secrets**: Consider rotating OAuth credentials periodically

## Testing

### Test Locally

1. Start the application
2. Click "Sign in with Google" on candidate or recruiter sign-in page
3. Select a Google account
4. Grant all requested permissions
5. Verify successful sign-in and redirect to dashboard
6. Test calendar feature by scheduling an interview

### Verify Token Storage

Check database to ensure tokens are stored:

```javascript
// In MongoDB/Supabase, check users table
user.google_data = {
  access_token: "ya29.a0...",  // Should exist
  refresh_token: "1//0g...",   // Should exist (critical!)
  scope: "openid email profile https://www.googleapis.com/auth/calendar",
  token_expiry: "2026-08-08T12:00:00.000Z"
}
```

### Test Token Refresh

1. Wait for access token to expire (~1 hour) OR manually clear it in database
2. Try to create a calendar event
3. Should automatically refresh token without user interaction
4. Check logs for "Token refresh" success message

## Production Checklist

- [ ] Google Cloud Project created
- [ ] OAuth consent screen configured
- [ ] Google+ API enabled
- [ ] Google Calendar API enabled
- [ ] OAuth credentials created
- [ ] Production redirect URIs added to Google Cloud Console
- [ ] Production redirect URIs use HTTPS
- [ ] Environment variables set in production
- [ ] Test full OAuth flow in production
- [ ] Test calendar event creation
- [ ] Monitor logs for OAuth errors
- [ ] Have users test from their accounts

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 Scopes for Google APIs](https://developers.google.com/identity/protocols/oauth2/scopes)
