import axios from "axios";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAuthSession,
} from "@/lib/auth-storage";
import { clearFcmSession, getStoredFcmToken } from "@/lib/fcm-session";
import { sanitizeOutgoingMedia } from "@/lib/media";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.ordinify.com",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

let refreshPromise = null;
let teardownPromise = null;

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = String(config.method || "get").toLowerCase();
  if (
    config.data &&
    ["post", "put", "patch", "delete"].includes(method)
  ) {
    config.data = sanitizeOutgoingMedia(config.data);
  }

  // Let the browser set multipart boundary for FormData uploads.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers && typeof config.headers.delete === "function") {
      config.headers.delete("Content-Type");
    } else if (config.headers) {
      delete config.headers["Content-Type"];
    }
  }

  return config;
});

function isLoginOrRefreshUrl(url) {
  return (
    url.includes("/api/employee/auth/login") ||
    url.includes("/api/employee/auth/refresh")
  );
}

/**
 * Best-effort FCM detach then wipe session.
 * Skips if a teardown is already running so 401s cannot recurse.
 */
function forceLogoutSession() {
  if (teardownPromise) return teardownPromise;

  teardownPromise = (async () => {
    const fcmToken = getStoredFcmToken();
    if (fcmToken) {
      try {
        await api.delete("/api/employee/portal/fcm-token", {
          data: { token: fcmToken },
          skipAuthClear: true,
        });
      } catch {
        // Session is dying; local token is still cleared below.
      }
    }

    clearFcmSession();
    clearAuthSession();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("ordinify:auth-cleared"));
    }
  })().finally(() => {
    teardownPromise = null;
  });

  return teardownPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const apiMessage = error.response?.data?.message;

    const url = String(original?.url || "");
    const isLoginOrRefresh = isLoginOrRefreshUrl(url);
    const skipAuthClear = Boolean(original?.skipAuthClear);

    // Refresh for any 401 except login/refresh themselves — including /auth/me.
    const canRefresh =
      status === 401 &&
      original &&
      !original._retry &&
      !isLoginOrRefresh &&
      Boolean(getRefreshToken());

    if (canRefresh) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post("/api/employee/auth/refresh", {
              refreshToken: getRefreshToken(),
            })
            .then((res) => {
              const payload = res.data?.data || res.data || {};
              const accessToken =
                payload.accessToken || payload.token || payload.access_token;
              const refreshToken =
                payload.refreshToken ||
                payload.refresh_token ||
                getRefreshToken();

              if (!accessToken) {
                throw new Error("Unable to refresh session");
              }

              setAuthSession({ accessToken, refreshToken });
              return accessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        if (!skipAuthClear) await forceLogoutSession();
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && !isLoginOrRefresh && !skipAuthClear && !teardownPromise) {
      await forceLogoutSession();
    }

    let message = apiMessage || error.message || "Something went wrong";
    if (status === 401) {
      message = apiMessage || "Please login to continue.";
    }

    const err = new Error(message);
    err.status = status;
    err.data = error.response?.data;
    return Promise.reject(err);
  }
);

export default api;
