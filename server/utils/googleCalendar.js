const { OAuth2Client } = require("google-auth-library");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_TIME_ZONE = process.env.GOOGLE_CALENDAR_TIMEZONE || "Asia/Kolkata";

async function getAccessTokenForUser(user) {
  if (!user?.google) {
    throw new Error(`${user?.userType === "recruiter" ? "Recruiter" : "Candidate"} has not connected Google Calendar. Please sign in with Google to enable calendar features.`);
  }

  // If stored access token is still valid (with 60s buffer), use it directly
  if (user.google.accessToken && user.google.tokenExpiry && new Date(user.google.tokenExpiry) > new Date(Date.now() + 60000)) {
    return user.google.accessToken;
  }

  if (!user.google.refreshToken) {
    throw new Error(`${user?.userType === "recruiter" ? "Recruiter" : "Candidate"} needs to reconnect their Google account. Please sign out and sign in again with Google to restore calendar features.`);
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth not configured on server");
  }

  const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: user.google.refreshToken });

  try {
    const tokenResponse = await client.getAccessToken();
    const accessToken =
      typeof tokenResponse === "string"
        ? tokenResponse
        : tokenResponse?.token;

    if (!accessToken) {
      throw new Error("Unable to refresh Google access token");
    }

    // Persist the refreshed token back to the user document
    try {
      const User = require("../models/User");
      await User.findByIdAndUpdate(user._id, {
        "google.accessToken": accessToken,
        "google.tokenExpiry": new Date(Date.now() + 3500 * 1000)
      });
    } catch (_) { /* non-critical */ }

    return accessToken;
  } catch (refreshError) {
    // If refresh fails but stored token is still valid, use it as last resort
    if (user.google.accessToken && user.google.tokenExpiry && new Date(user.google.tokenExpiry) > new Date()) {
      return user.google.accessToken;
    }
    
    // Provide actionable error message
    console.error('Token refresh failed:', refreshError);
    throw new Error(`Google authentication expired. Please sign out and sign in again with Google to restore calendar features.`);
  }
}

async function createCalendarEventForUser(user, event) {
  const accessToken = await getAccessTokenForUser(user);

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data?.error?.message || "Failed to create Google Calendar event";
    console.error('Google Calendar API error:', {
      status: response.status,
      statusText: response.statusText,
      error: data?.error
    });
    throw new Error(errorMessage);
  }

  return data;
}

async function createInterviewEventWithFallback({
  candidateUser,
  recruiterUser,
  event
}) {
  try {
    const created = await createCalendarEventForUser(candidateUser, event);
    return {
      event: created,
      calendarOwner: "candidate"
    };
  } catch (candidateError) {
    try {
      const created = await createCalendarEventForUser(recruiterUser, event);
      return {
        event: created,
        calendarOwner: "recruiter",
        warning: candidateError.message || "Could not write directly to the candidate's calendar."
      };
    } catch (recruiterError) {
      throw new Error(
        `Calendar sync failed. Candidate: ${candidateError.message || "unknown error"}. Recruiter fallback: ${recruiterError.message || "unknown error"}.`
      );
    }
  }
}

function buildInterviewEvent({
  application,
  candidateUser,
  recruiterUser,
  startDate,
  interviewType
}) {
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  const wantsMeet = interviewType === "video";

  return {
    summary: `Interview: ${application.jobId?.title || "TalentBridge interview"}`,
    description: [
      `Interview scheduled via TalentBridge.`,
      `Role: ${application.jobId?.title || "Interview"}`,
      `Company: ${application.jobId?.company || recruiterUser.companyName || recruiterUser.fullName || "Recruiter"}`,
      `Interview type: ${interviewType}`
    ].join("\n"),
    start: {
      dateTime: startDate.toISOString(),
      timeZone: GOOGLE_TIME_ZONE
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: GOOGLE_TIME_ZONE
    },
    attendees: [candidateUser.email, recruiterUser.email]
      .filter(Boolean)
      .map((email) => ({ email })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 60 }
      ]
    },
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    guestsCanSeeOtherGuests: true,
    conferenceData: wantsMeet
      ? {
          createRequest: {
            requestId: `tb-int-${application._id}-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" }
          }
        }
      : undefined
  };
}

function buildAssessmentEvent({
  application,
  candidateUser,
  recruiterUser,
  dueDate,
  assessmentTitle,
  assessmentLink
}) {
  const startDate = new Date(dueDate);
  startDate.setHours(9, 0, 0, 0);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

  return {
    summary: `OA Reminder: ${assessmentTitle || application.jobId?.title || "Online Assessment"}`,
    description: [
      `Online assessment reminder from TalentBridge.`,
      `Role: ${application.jobId?.title || "Assessment"}`,
      `Company: ${application.jobId?.company || recruiterUser.companyName || recruiterUser.fullName || "Recruiter"}`,
      assessmentLink ? `OA link: ${assessmentLink}` : "OA link will be shared by the recruiter."
    ].join("\n"),
    start: {
      dateTime: startDate.toISOString(),
      timeZone: GOOGLE_TIME_ZONE
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: GOOGLE_TIME_ZONE
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 120 }
      ]
    },
    attendees: [candidateUser?.email, recruiterUser?.email]
      .filter(Boolean)
      .map((email) => ({ email }))
  };
}

module.exports = {
  createCalendarEventForUser,
  createInterviewEventWithFallback,
  buildInterviewEvent,
  buildAssessmentEvent
};
