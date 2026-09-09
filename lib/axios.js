import axios from "axios";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAuthSession,
} from "@/lib/auth-storage";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.ordinify.com",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

let refreshPromise = null;

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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

function forceLogoutSession() {
  clearAuthSession();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ordinify:auth-cleared"));
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const apiMessage = error.response?.data?.message;

    const url = String(original?.url || "");
    const isAuthRoute = url.includes("/api/employee/auth/");
    const isLoginOrRefresh =
      url.includes("/api/employee/auth/login") ||
      url.includes("/api/employee/auth/refresh");

    const canRefresh =
      status === 401 &&
      original &&
      !original._retry &&
      !isAuthRoute &&
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
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        forceLogoutSession();
        return Promise.reject(refreshError);
      }
    }

    // Unauthorized and cannot refresh → clear session (except failed login itself).
    if (status === 401 && !isLoginOrRefresh) {
      forceLogoutSession();
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
