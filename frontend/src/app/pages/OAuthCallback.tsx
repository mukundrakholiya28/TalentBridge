import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { clearAuthSession, setAuthSession } from "../../utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export function OAuthCallback() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const stateRaw = params.get('state');
        const error = params.get('error');

        if (error) {
          toast.error('Google OAuth failed: ' + error);
          setLoading(false);
          return;
        }

        if (!code) {
          toast.error('Missing authorization code');
          setLoading(false);
          return;
        }

        let state = { userType: 'candidate', intent: 'signin' };
        try {
          if (stateRaw) state = JSON.parse(stateRaw);
        } catch (e) {
          // ignore
        }

        const redirectUri =
          import.meta.env.VITE_GOOGLE_OAUTH_REDIRECT ||
          (window.location.origin + '/auth/oauth-callback');

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
          })
        });

        let resp: any = null;
        try {
          resp = await response.json();
        } catch (e) {
          resp = null;
        }

        if (response.ok && resp && resp.token) {
          if (state.intent === 'signin' && resp.user.userType !== state.userType) {
            clearAuthSession();
            toast.error(`Account is registered as ${resp.user.userType}. Please use the correct sign-in page.`);
            navigate(resp.user.userType === 'recruiter' ? '/recruiter/signin' : '/candidate/signin', {
              replace: true
            });
            return;
          }

          setAuthSession(resp.token, resp.user, true);
          toast.success(state.intent === 'signup' ? 'Signed up successfully' : 'Signed in successfully');

          const target = state.intent === 'signup'
            ? (resp.user.userType === 'recruiter' ? '/recruiter/complete-company' : '/candidate/complete-profile')
            : (resp.user.userType === 'recruiter' ? '/recruiter/dashboard' : '/candidate/dashboard');

          navigate(target);
        } else {
          const message = resp?.error || `OAuth exchange failed (${response.status})`;
          console.error('OAuth callback backend error:', { status: response.status, body: resp });

          if (state.intent === 'signup' && /account already exists/i.test(message)) {
            toast.error(message);
            navigate(state.userType === 'recruiter' ? '/recruiter/signin' : '/candidate/signin', {
              replace: true
            });
            return;
          }

          if (state.intent === 'signin' && /account is registered as/i.test(message)) {
            toast.error(message);
            const target = /registered as recruiter/i.test(message)
              ? '/recruiter/signin'
              : '/candidate/signin';
            navigate(target, { replace: true });
            return;
          }

          setErrorMessage(message);
          toast.error(message);
        }
      } catch (err) {
        console.error('OAuth callback error', err);
        const message = err instanceof Error ? err.message : 'OAuth callback failed';
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">Processing OAuth callback...</div>;
  if (errorMessage) return <div className="p-6 text-red-600">OAuth callback failed: {errorMessage}</div>;
  return <div className="p-6">Redirecting...</div>;
}
