import { toast } from "sonner";

// Google Client ID - must match backend .env GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_ID = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) || "";

interface GoogleSignInButtonProps {
    userType: "candidate" | "recruiter";
    action?: "signin" | "signup";
}

export function GoogleSignInButton({ userType, action = "signin" }: GoogleSignInButtonProps) {
    const isConfigured = Boolean(GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes("your-google-client-id"));

    if (!isConfigured) {
        return (
            <button
                type="button"
                onClick={() => toast.error("Google OAuth is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 opacity-60 hover:opacity-100 transition"
            >
                <GoogleIcon />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Google Sign-In (Set Client ID in .env)
                </span>
            </button>
        );
    }

    return (
        <div className="w-full">
            <button
                type="button"
                onClick={() => startCodeFlow(userType, action)}
                className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-accent/80 active:scale-[0.99] shadow-xs"
            >
                <GoogleIcon />
                <span>
                    {action === "signup" ? "Continue with Google" : "Sign in with Google"}
                </span>
            </button>
        </div>
    );
}

function startCodeFlow(userType: string, intent: string) {
    const clientId = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) || '';
    if (!clientId || clientId.includes("your-google-client-id")) {
        toast.error("Invalid Google Client ID in environment configuration.");
        return;
    }

    const redirectUri = ((typeof process !== "undefined" && process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT) || (window.location.origin + '/auth/oauth-callback')) as string;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile https://www.googleapis.com/auth/calendar',
        access_type: 'offline',
        prompt: 'consent',
        state: JSON.stringify({ userType, intent })
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Inline Google "G" icon for the button */
function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
    );
}
