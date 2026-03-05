import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Briefcase, User, Mail, Phone, Upload, Eye, EyeOff, Lock } from "lucide-react";
import { apiClient } from "../../utils/apiClient";
import { toast } from "sonner";
import logo from "../../assets/0ed04b30b5fcacaeb0065c439ebb8dc86719fd9d.png";


export function CandidateSignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    resume: null as File | null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.phone,
        userType: 'candidate',
      };

      const result = await apiClient.post('/auth/register', payload);

      if (result.token) {
        toast.success("Account created successfully!");

        // Save the real JWT token
        localStorage.setItem("token", result.token);
        localStorage.setItem("userRole", result.user.userType);
        localStorage.setItem("user", JSON.stringify(result.user));

        navigate("/candidate/dashboard");
      } else {
        toast.error(result.error || "Failed to create account. Please try again.");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const [isParsing, setIsParsing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({ ...prev, resume: file }));

      if (file.type === "application/pdf") {
        setIsParsing(true);
        toast.loading("Google Gemini AI is parsing your resume...", { id: "parse-resume" });

        try {
          const formData = new FormData();
          formData.append('resume', file);

          const response = await fetch('http://localhost:5000/api/upload-resume', {
            method: 'POST',
            body: formData
          });

          const result = await response.json();

          if (result.success && result.data) {
            const parsedData = result.data;

            setFormData(prev => ({
              ...prev,
              fullName: parsedData.name || prev.fullName,
              email: parsedData.email || prev.email,
              phone: parsedData.phone || prev.phone
            }));

            toast.success("Resume parsed! We've auto-filled your details via Gemini.", { id: "parse-resume" });
          } else {
            toast.error(result.error || "Failed to extract details via AI.", { id: "parse-resume" });
          }
        } catch (err) {
          console.error("AI Node.js Backend Parsing failed:", err);
          toast.error("Failed to connect to AI parsing service (is Node server running?)", { id: "parse-resume" });
        } finally {
          setIsParsing(false);
        }
      } else {
        toast.info("Only PDF files support auto-parsing currently.");
      }
    }
  };

  const handleSocialSignUp = (provider: string) => {
    // Mock social sign up
    console.log(`Signing up with ${provider}`);
    navigate("/candidate/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="CONSOLE" className="w-8 h-8" />
              <span className="text-xl font-semibold text-gray-900 dark:text-white">CONSOLE</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Already have an account?</span>
              <Link
                to="/candidate/signin"
                className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Sign Up Form */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Create Your Account
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Join CONSOLE and start your career journey
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter your phone number"
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
                    placeholder="Create a password"
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

              <div>
                <label htmlFor="resume" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Resume Upload
                </label>
                <div className="relative">
                  <input
                    id="resume"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                  />
                  <label
                    htmlFor="resume"
                    className="flex items-center justify-center w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Upload className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {isParsing ? "Analyzing resume..." : formData.resume ? formData.resume.name : "Choose file or drag here"}
                    </span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">Accepted formats: PDF, DOC, DOCX (Max 5MB)</p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={loading || isParsing}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or sign up with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSocialSignUp("Google")}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Google</span>
                </button>
                <button
                  onClick={() => handleSocialSignUp("LinkedIn")}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">LinkedIn</span>
                </button>
                <button
                  onClick={() => handleSocialSignUp("Microsoft")}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Microsoft</span>
                </button>
                <button
                  onClick={() => handleSocialSignUp("Apple")}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Apple</span>
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Are you a recruiter? </span>
              <Link to="/recruiter/signup" className="text-sm text-blue-600 hover:text-blue-700">
                Sign up here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}