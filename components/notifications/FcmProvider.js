"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Bell, X } from "lucide-react";
import { registerFcmToken } from "@/api/fcm";
import { useAuth } from "@/components/auth/AuthProvider";
import { bindForegroundMessages, getWebFcmToken } from "@/lib/firebase-client";
import { Button } from "@/components/ui/Button";

const FCM_TOKEN_KEY = "employee_fcm_token";
const FCM_BANNER_DISMISS_KEY = "employee_fcm_banner_dismissed";

const FcmContext = createContext(null);

function getStoredFcmToken() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(FCM_TOKEN_KEY) || "";
}

export function clearStoredFcmToken() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(FCM_TOKEN_KEY);
}

function readPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission; // "default" | "granted" | "denied"
}

/**
 * Must run from a user click — browsers block auto permission prompts.
 */
export async function enableWebPushNotifications() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("This browser does not support notifications.");
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked. Enable them from browser site settings."
        : "Notification permission was not granted."
    );
  }

  const token = await getWebFcmToken();
  if (!token) {
    throw new Error(
      "Could not create push token. Check Firebase VAPID key and restart the app."
    );
  }

  await registerFcmToken({ token, platform: "web" });
  window.sessionStorage.setItem(FCM_TOKEN_KEY, token);
  window.sessionStorage.removeItem(FCM_BANNER_DISMISS_KEY);
  return token;
}

let syncInflight = null;

async function syncTokenIfAlreadyGranted() {
  if (readPermission() !== "granted") return null;
  if (syncInflight) return syncInflight;

  syncInflight = (async () => {
    try {
      const token = await getWebFcmToken();
      if (!token) return null;

      const prev = getStoredFcmToken();
      if (prev === token) return token;

      // Mark early so a Strict Mode remount won't POST again mid-flight.
      window.sessionStorage.setItem(FCM_TOKEN_KEY, token);
      await registerFcmToken({ token, platform: "web" });
      return token;
    } catch (err) {
      // Allow retry on next mount if register failed.
      const stored = getStoredFcmToken();
      if (stored) window.sessionStorage.removeItem(FCM_TOKEN_KEY);
      throw err;
    } finally {
      syncInflight = null;
    }
  })();

  return syncInflight;
}

export function useFcm() {
  const ctx = useContext(FcmContext);
  return (
    ctx || {
      permission: "unsupported",
      enabling: false,
      error: "",
      enable: async () => {},
      dismissBanner: () => {},
      showBanner: false,
    }
  );
}

export function FcmProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [permission, setPermission] = useState("default");
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    setPermission(readPermission());
    setBannerDismissed(
      typeof window !== "undefined" &&
        window.sessionStorage.getItem(FCM_BANNER_DISMISS_KEY) === "1"
    );
  }, []);

  // After login: only register if permission already granted (no auto prompt).
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let alive = true;
    (async () => {
      try {
        await syncTokenIfAlreadyGranted();
        if (alive) setPermission(readPermission());
      } catch {
        // Keep app usable even if FCM fails.
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let unbind = () => {};
    (async () => {
      unbind = await bindForegroundMessages((payload) => {
        if (typeof window === "undefined") return;
        if (Notification.permission !== "granted") return;
        const title = payload?.notification?.title || "New notification";
        const body = payload?.notification?.body || "";
        new Notification(title, { body });
      });
    })();
    return () => {
      unbind?.();
    };
  }, []);

  const enable = useCallback(async () => {
    setEnabling(true);
    setError("");
    try {
      await enableWebPushNotifications();
      setPermission("granted");
      setBannerDismissed(true);
    } catch (err) {
      setPermission(readPermission());
      setError(err?.message || "Failed to enable notifications.");
      throw err;
    } finally {
      setEnabling(false);
    }
  }, []);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(FCM_BANNER_DISMISS_KEY, "1");
    }
  }, []);

  const showBanner =
    isAuthenticated &&
    permission === "default" &&
    !bannerDismissed;

  const value = useMemo(
    () => ({
      permission,
      enabling,
      error,
      enable,
      dismissBanner,
      showBanner,
    }),
    [permission, enabling, error, enable, dismissBanner, showBanner]
  );

  return (
    <FcmContext.Provider value={value}>
      {showBanner ? (
        <div className="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)] sm:left-auto sm:right-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lavender-soft)] text-[var(--violet)]">
              <Bell className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[var(--text)]">
                Enable notifications?
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                Get push alerts for announcements and approvals. Browser needs
                your click to allow this.
              </p>
              {error ? (
                <p className="mt-1.5 text-[12px] font-medium text-[var(--danger)]">
                  {error}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="h-9 rounded-xl px-3 text-[12px]"
                  disabled={enabling}
                  onClick={() => {
                    enable().catch(() => {});
                  }}
                >
                  {enabling ? "Enabling…" : "Allow notifications"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl px-3 text-[12px]"
                  onClick={dismissBanner}
                >
                  Not now
                </Button>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
              aria-label="Dismiss"
              onClick={dismissBanner}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
      {children}
    </FcmContext.Provider>
  );
}
