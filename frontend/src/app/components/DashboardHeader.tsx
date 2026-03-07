import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  FileText,
  Clock,
  Mail,
  MessageSquare,
  Settings,
  LogOut,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import logo from "../../assets/logo.png";
import { clearAuthSession, setUserRoleForActiveSession, getStoredUser, updateStoredUser } from "../../utils/authStorage";
import { apiClient } from "../../utils/apiClient";

export function DashboardHeader() {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(getStoredUser()?.avatarUrl || "");

  useEffect(() => {
    try {
      setUserRoleForActiveSession("candidate");
    } catch (e) {
      // ignore
    }
    apiClient.get('/candidate/profile').then((data) => {
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

  const handleLogout = async () => {
    try {
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuthSession();
      navigate("/");
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/candidate/dashboard")}>
            <img src={logo} alt="CONSOLE | TalentBridge" className="w-10 h-10" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">CONSOLE | TalentBridge</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/candidate/dashboard")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Home"
            >
              <Home className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 py-2">
                  <button
                    onClick={() => {
                      navigate("/candidate/profile");
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate("/candidate/applications");
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <FileText className="w-4 h-4" />
                    <span>My Applications</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate("/candidate/in-process");
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Clock className="w-4 h-4" />
                    <span>In Process</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate("/candidate/offers");
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Offer Letters</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate("/candidate/messages");
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Messages</span>
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-800 my-2"></div>
                  <button
                    onClick={() => {
                      navigate("/candidate/settings");
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <LogOut className="w-4 h-4" />
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
