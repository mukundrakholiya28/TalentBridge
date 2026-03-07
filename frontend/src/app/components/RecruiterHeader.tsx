import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  User,
  Briefcase,
  Users,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  ChevronDown,
  Home
} from "lucide-react";
import logo from "../../assets/logo.png";
import { clearAuthSession, setUserRoleForActiveSession, getStoredUser, updateStoredUser } from "../../utils/authStorage";
import { apiClient } from "../../utils/apiClient";

export function RecruiterHeader() {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(getStoredUser()?.avatarUrl || "");

  useEffect(() => {
    try {
      setUserRoleForActiveSession("recruiter");
    } catch (e) {
      // ignore (SSR or privacy settings)
    }
    apiClient.get('/recruiter/profile').then((data) => {
      if (data?.profile?.avatarUrl) {
        setAvatarUrl(data.profile.avatarUrl);
        updateStoredUser({ avatarUrl: data.profile.avatarUrl });
      }
    }).catch(() => {});

    const onUserUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.avatarUrl !== undefined) setAvatarUrl(detail.avatarUrl);
    };
    window.addEventListener('user-updated', onUserUpdated);
    return () => window.removeEventListener('user-updated', onUserUpdated);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  const menuItems = [
    { icon: User, label: "Profile", path: "/recruiter/profile" },
    { icon: Briefcase, label: "My Jobs", path: "/recruiter/jobs" },
    { icon: Users, label: "All Applications", path: "/recruiter/applications" },
    { icon: FileText, label: "In Process Candidates", path: "/recruiter/in-process" },
    { icon: FileText, label: "Offer Letters", path: "/recruiter/offers" },
    { icon: MessageSquare, label: "Messages", path: "/recruiter/messages" },
    { icon: Settings, label: "Settings", path: "/recruiter/settings" },
  ];

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/recruiter/dashboard")}
          >
            <img src={logo} alt="CONSOLE | TalentBridge" className="w-10 h-10" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              CONSOLE | TalentBridge<span className="hidden sm:inline"> - Recruiter</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/recruiter/dashboard")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Home"
            >
              <Home className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 py-2">
                  {menuItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        navigate(item.path);
                        setShowDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{item.label}</span>
                    </button>
                  ))}
                  <div className="border-t border-gray-200 dark:border-gray-800 my-2"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
