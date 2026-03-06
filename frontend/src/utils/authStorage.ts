type AuthUser = {
  userType?: string;
  [key: string]: any;
};

const KEYS = ["token", "accessToken", "userRole", "user", "userId"];

const hasToken = (storage: Storage) =>
  !!(storage.getItem("token") || storage.getItem("accessToken"));

const activeStorage = () => {
  if (hasToken(localStorage)) return localStorage;
  if (hasToken(sessionStorage)) return sessionStorage;
  return localStorage;
};

export const getAuthToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("accessToken") ||
  "";

export const getUserRole = () =>
  localStorage.getItem("userRole") ||
  sessionStorage.getItem("userRole") ||
  (() => {
    try {
      const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
      if (!raw) return "";
      const parsed = JSON.parse(raw);
      return parsed?.userType || "";
    } catch {
      return "";
    }
  })();

export const setAuthSession = (token: string, user: AuthUser, rememberMe = true) => {
  clearAuthSession();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem("token", token);
  storage.setItem("userRole", user?.userType || "");
  storage.setItem("user", JSON.stringify(user || {}));
};

export const clearAuthSession = () => {
  for (const key of KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

export const setUserRoleForActiveSession = (role: string) => {
  const storage = activeStorage();
  storage.setItem("userRole", role);
};
