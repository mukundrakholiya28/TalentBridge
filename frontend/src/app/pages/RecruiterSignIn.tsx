import { useState } from "react";
import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { apiClient } from "../../utils/apiClient";
import { clearAuthSession, getAuthToken, getUserRole, setAuthSession } from "../../utils/authStorage";
import { toast } from "sonner";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import logo from "../../assets/0ed04b30b5fcacaeb0065c439ebb8dc86719fd9d.png";


export function RecruiterSignIn() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    identifier: "",
    password: ""
  });
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    const role = getUserRole();
    if (token && role === "recruiter") {
      navigate("/recruiter/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await apiClient.post('/auth/login', {
        identifier: formData.identifier,
        password: formData.password,
        userType: 'recruiter'
      });

      if (result.token) {
        toast.success("Signed in successfully!");

        setAuthSession(result.token, result.user, rememberMe);

        // Check user role and navigate accordingly
        if (result.user.userType === 'recruiter') {
          navigate("/recruiter/dashboard");
        } else {
          toast.error("Please use the candidate sign in page");
          clearAuthSession();
        }
      } else {
        toast.error(result.error || "Invalid email or password");
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error(error.message || "Invalid username, email, or password");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="CONSOLE" className="w-10 h-10" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">CONSOLE</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">New to CONSOLE?</span>
              <Link
                to="/recruiter/signup"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-8">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Recruiter Sign In
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Access your recruitment dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username or Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="identifier"
                    type="text"
                    value={formData.identifier}
                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter your username or email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Remember me
                  </label>
                </div>
                <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6">
              <GoogleSignInButton userType="recruiter" action="signin" />
            </div>

            <div className="mt-6 text-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Are you a job seeker? </span>
              <Link to="/candidate/signin" className="text-sm text-blue-600 hover:text-blue-700">
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
