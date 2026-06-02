import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { auth as authApi, users as usersApi, setToken, clearToken, getToken } from "@/adminFunctions/api";

type Role = "admin" | "employee";

export interface User {
  id: string;
  username: string;
  role: Role;
  isActive?: boolean;
}

export interface SessionUser {
  id: string;
  username: string;
  role: Role;
}

export const ADMIN_RECOVERY_QUESTION =
  "ما الكلمة السرية التي تختارها أنت وحدك ولا يعرفها أحد؟";

export const ADMIN_RECOVERY_QUESTION_HINT =
  "لا تستخدم لقباً أو اسماً يعرفه أقاربك أو أصدقاؤك. اختر كلمة أو كلمتين خاصتين بك فقط (مثل: وميض، نجم ليل).";

export const RECOVERY_ANSWER_MIN_LENGTH = 2;
export const RECOVERY_ANSWER_MAX_LENGTH = 40;

export function normalizeRecoveryAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

interface AuthContextType {
  role: Role | null;
  currentUser: SessionUser | null;
  users: User[];
  login: (username: string, password?: string) => Promise<void>;
  logout: () => void;
  addUser: (username: string, password?: string, role?: Role) => Promise<void>;
  deleteUser: (id: string) => void;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  setUserPassword: (userId: string, newPassword: string) => Promise<void>;
  hasRecoverySecretConfigured: () => boolean;
  setAdminRecoverySecret: (answer: string, currentPassword: string) => Promise<void>;
  resetAdminPasswordWithRecovery: (username: string, recoveryAnswer: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJwtPayload(token: string): { sub: string; username: string; role: Role; exp: number } | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function restoreSessionFromToken(): SessionUser | null {
  const token = getToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload || payload.exp * 1000 < Date.now()) {
    clearToken();
    return null;
  }
  return { id: payload.sub, username: payload.username, role: payload.role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(restoreSessionFromToken);
  const [userList, setUserList] = useState<User[]>([]);
  const [recoveryConfigured, setRecoveryConfigured] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "admin") {
      usersApi.getAll().then(users => setUserList(users as User[])).catch(() => { });
    }
    authApi.checkRecovery(currentUser.username)
      .then(r => setRecoveryConfigured(r.configured))
      .catch(() => { });
  }, [currentUser?.id]);

  const login = async (username: string, password?: string) => {
    const result = await authApi.login(username, password ?? "");
    setToken(result.token);
    const session: SessionUser = {
      id: result.user.id,
      username: result.user.username,
      role: result.user.role as Role,
    };
    setCurrentUser(session);
    if (session.role === "admin") {
      usersApi.getAll().then(users => setUserList(users as User[])).catch(() => { });
    }
    authApi.checkRecovery(session.username).then(r => setRecoveryConfigured(r.configured)).catch(() => { });
  };

  const logout = () => {
    clearToken();
    setCurrentUser(null);
    setUserList([]);
    setRecoveryConfigured(false);
  };

  const addUser = async (username: string, password?: string, role: Role = "employee") => {
    const created = await usersApi.create(username.trim(), password ?? "", role);
    setUserList(prev => [...prev, { ...created, role: created.role as Role }]);
  };

  const deleteUser = async (id: string) => {
    try {
      await usersApi.deactivate(id);
      setUserList(prev => prev.filter(u => u.id !== id));
    } catch { }
  };

  const updatePassword = async (oldPassword: string, newPassword: string) => {
    if (!currentUser) throw new Error("غير مسجل الدخول");
    await authApi.changePassword(oldPassword, newPassword);
  };

  const setUserPassword = async (_userId: string, _newPassword: string) => {
    throw new Error("غير متاح — يرجى استخدام لوحة إدارة المستخدمين في الخادم.");
  };

  const hasRecoverySecretConfigured = () => recoveryConfigured;

  const setAdminRecoverySecret = async (answer: string, currentPassword: string) => {
    if (!currentUser || currentUser.role !== "admin") throw new Error("هذا الإجراء للأدمن فقط");
    await authApi.changePassword(currentPassword, currentPassword);
    const normalized = normalizeRecoveryAnswer(answer);
    if (normalized.length < RECOVERY_ANSWER_MIN_LENGTH) throw new Error("أدخل كلمة أو كلمتين على الأقل");
    if (normalized.length > RECOVERY_ANSWER_MAX_LENGTH) throw new Error(`الإجابة طويلة جداً`);
    await authApi.setupRecovery(normalized);
    setRecoveryConfigured(true);
  };

  const resetAdminPasswordWithRecovery = async (
    username: string,
    recoveryAnswer: string,
    newPassword: string,
  ) => {
    await authApi.recovery(username, normalizeRecoveryAnswer(recoveryAnswer), newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        role: currentUser?.role || null,
        currentUser,
        users: userList,
        login,
        logout,
        addUser,
        deleteUser,
        updatePassword,
        setUserPassword,
        hasRecoverySecretConfigured,
        setAdminRecoverySecret,
        resetAdminPasswordWithRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
