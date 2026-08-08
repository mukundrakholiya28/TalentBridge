import { useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";
import { clearAuthSession, setAuthSession } from "../../utils/authStorage";

const API_BASE_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '/api';

export function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      let userType = 'candidate';
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const stateRaw = params.get('state');
        const error = params.get('error');

        let state = { userType: 'candidate', intent: 'signin' };
        try {
          if (stateRaw) state = JSON.parse(stateRaw);
        } catch (e) { }

        userType = state.userType || 'candidate';
        const fallbackPage = userType === 'recruiter' ? '/recruiter/signin' : '/candidate/signin';

        if (error) {
          toast.error('Google Sign-In cancelled or failed: ' + error);
          navigate(fallbackPage, { replace: true });
          return;
        }

        if (!code) {
          toast.error('Missing Google authorization code');
          navigate(fallbackPage, { replace: true });
          return;
        }

        const redirectUri =
          (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT) ||
          (window.location.origin + '/auth/oauth-callback');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(`${API_BASE_URL}/auth/oauth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code,
            redirectUri,
            userType: state.userType,
            intent: state.intent
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        let resp: any = null;
        try {
          resp = await response.json();
        } catch (e) {
          resp = null;
        }

        if (response.ok && resp && resp.token) {
          setAuthSession(resp.token, resp.user, true);
          toast.success(resp.user.userType === 'recruiter' ? 'Signed in as Recruiter' : 'Signed in as Candidate');

          // Show warning if present (e.g., missing refresh token)
          if (resp.warning) {
            setTimeout(() => toast.warning(resp.warning), 1500);
          }

          const target = resp.user.userType === 'recruiter' ? '/recruiter/dashboard' : '/candidate/dashboard';
          navigate(target, { replace: true });
        } else {
          const message = resp?.error || `Authentication failed (${response.status})`;
          toast.error(message);
          navigate(fallbackPage, { replace: true });
        }
      } catch (err) {
        console.error('OAuth callback error', err);
        const message = err instanceof Error
          ? (err.name === 'AbortError' ? 'Google authentication timed out. Please try again.' : err.message)
          : 'Google authentication failed';
        toast.error(message);

        const fallbackPage = userType === 'recruiter' ? '/recruiter/signin' : '/candidate/signin';
        navigate(fallbackPage, { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xl backdrop-blur-sm">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h2 className="text-xl font-bold text-foreground">Authenticating with Google...</h2>
        <p className="text-muted-foreground text-sm">Please wait while we complete your sign-in.</p>
      </div>
    </div>
  );
}
