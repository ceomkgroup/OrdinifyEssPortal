"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  changePassword as changePasswordApi,
  forgotPassword as forgotPasswordApi,
  getAuthMe,
  loginEmployee,
  logoutEmployee,
  resetPassword as resetPasswordApi,
  updateAuthProfile,
  uploadProfilePhoto as uploadProfilePhotoApi,
} from "@/api/auth";
import {
  clearAuthSession,
  getAccessToken,
  getStoredEmployee,
  pickEmployee,
  setAuthSession,
} from "@/lib/auth-storage";
import { clearPortalCaches } from "@/api/portal";
import { FullScreenLoader } from "@/components/ui/Spinner";

const AuthContext = createContext(null);
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

function isIncompleteProfile(employee) {
  if (!employee) return true;
  return !(
    employee.departmentName ||
    employee.designationName ||
    employee.branchName ||
    employee.joinDate ||
    employee.employmentType
  );
}

function mergeEmployee(prev, next) {
  if (!next) return prev || null;
  if (!prev) return next;

  const merged = { ...prev };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "" && prev[key]) continue;
    merged[key] = value;
  }
  return merged;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [employee, setEmployee] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  const isPublic = PUBLIC_PATHS.some((path) => pathname?.startsWith(path));

  useEffect(() => {
    let alive = true;

    (async () => {
      const token = getAccessToken();
      if (!token) {
        if (!alive) return;
        setHasToken(false);
        setEmployee(null);
        setBootstrapping(false);
        return;
      }

      const cached = getStoredEmployee();
      if (!alive) return;

      setHasToken(true);
      if (cached && !isIncompleteProfile(cached)) {
        setEmployee(cached);
        setBootstrapping(false);
        return;
      }

      if (cached) setEmployee(cached);

      try {
        const me = await getAuthMe();
        if (!alive) return;
        const profile = pickEmployee(me) || pickEmployee(me?.data) || me;
        const merged = mergeEmployee(cached, profile);
        setEmployee(merged);
        setAuthSession({ employee: merged });
      } catch {
        if (!alive) return;
        if (cached) {
          // Keep cached profile if /me fails.
          setEmployee(cached);
        } else {
          clearAuthSession();
          setHasToken(false);
          setEmployee(null);
        }
      } finally {
        if (alive) setBootstrapping(false);
      }
    })();

    const onAuthCleared = () => {
      setHasToken(false);
      setEmployee(null);
      clearPortalCaches();
      if (!PUBLIC_PATHS.some((path) => window.location.pathname.startsWith(path))) {
        router.replace("/login");
      }
    };
    window.addEventListener("ordinify:auth-cleared", onAuthCleared);

    return () => {
      alive = false;
      window.removeEventListener("ordinify:auth-cleared", onAuthCleared);
    };
  }, [router]);

  useEffect(() => {
    if (bootstrapping) return;

    if (!hasToken && !isPublic) {
      router.replace("/login");
      return;
    }

    if (hasToken && (pathname === "/login" || pathname === "/")) {
      router.replace("/dashboard");
    }
  }, [bootstrapping, hasToken, isPublic, pathname, router]);

  const login = useCallback(
    async ({ email, password }) => {
      setAuthLoading(true);
      try {
        const session = await loginEmployee({ email, password });
        setAuthSession(session);
        setHasToken(true);

        // Prefer employee from login response — call /me only if login didn't return it.
        if (session.employee) {
          setEmployee(session.employee);
        } else {
          try {
            const me = await getAuthMe();
            const profile = pickEmployee(me) || pickEmployee(me?.data) || me;
            if (profile) {
              setEmployee(profile);
              setAuthSession({ employee: profile });
            }
          } catch {
            // Login succeeded; profile can load later from Profile page.
          }
        }

        clearPortalCaches();
        router.replace("/dashboard");
        return session;
      } finally {
        setAuthLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    setAuthLoading(true);
    try {
      await logoutEmployee();
    } finally {
      clearAuthSession();
      clearPortalCaches();
      setHasToken(false);
      setEmployee(null);
      setAuthLoading(false);
      router.replace("/login");
    }
  }, [router]);

  const refreshProfile = useCallback(async () => {
    const me = await getAuthMe();
    const profile = pickEmployee(me) || pickEmployee(me?.data) || me;
    let merged = profile;
    setEmployee((prev) => {
      merged = mergeEmployee(prev, profile);
      setAuthSession({ employee: merged });
      return merged;
    });
    return merged;
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const updated = await updateAuthProfile(payload);
    const profile =
      pickEmployee(updated) ||
      pickEmployee(updated?.data) ||
      updated?.employee ||
      updated?.user ||
      updated;
    let merged = profile;
    setEmployee((prev) => {
      merged = mergeEmployee(prev, profile);
      setAuthSession({ employee: merged });
      return merged;
    });
    return merged;
  }, []);

  const changePassword = useCallback(async (payload) => {
    return changePasswordApi(payload);
  }, []);

  const mergeLocalEmployee = useCallback((partial) => {
    let merged = partial;
    setEmployee((prev) => {
      merged = mergeEmployee(prev, partial);
      setAuthSession({ employee: merged });
      return merged;
    });
    return merged;
  }, []);

  const uploadPhoto = useCallback(async (file) => {
    const updated = await uploadProfilePhotoApi(file);
    const profile =
      pickEmployee(updated) ||
      pickEmployee(updated?.data) ||
      updated?.employee ||
      updated?.user ||
      updated;

    if (profile && typeof profile === "object") {
      let merged = profile;
      setEmployee((prev) => {
        merged = mergeEmployee(prev, profile);
        setAuthSession({ employee: merged });
        return merged;
      });
      return merged;
    }

    return refreshProfile();
  }, [refreshProfile]);

  const forgotPassword = useCallback(async ({ email }) => {
    return forgotPasswordApi({ email });
  }, []);

  const resetPassword = useCallback(async (payload) => {
    return resetPasswordApi(payload);
  }, []);

  const value = useMemo(
    () => ({
      employee,
      isAuthenticated: hasToken,
      bootstrapping,
      authLoading,
      login,
      logout,
      refreshProfile,
      updateProfile,
      changePassword,
      mergeLocalEmployee,
      uploadPhoto,
      forgotPassword,
      resetPassword,
    }),
    [
      employee,
      hasToken,
      bootstrapping,
      authLoading,
      login,
      logout,
      refreshProfile,
      updateProfile,
      changePassword,
      mergeLocalEmployee,
      uploadPhoto,
      forgotPassword,
      resetPassword,
    ]
  );

  if (bootstrapping) {
    return <FullScreenLoader label="Loading" hint="Starting Ordinify…" />;
  }

  if (!hasToken && !isPublic) {
    return <FullScreenLoader label="Signing you in" hint="Checking your session…" />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
