import api from "@/lib/axios";
import { normalizeAuthPayload } from "@/lib/auth-storage";

/** Friendly device label for web login payload (browser + OS). */
export function getWebDeviceName() {
  if (typeof navigator === "undefined") return "Web Browser";

  const ua = navigator.userAgent || "";
  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  let os = "PC";
  if (/Windows NT/i.test(ua)) os = "Windows PC";
  else if (/Mac OS X/i.test(ua)) os = "Mac";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux PC";
  else if (/CrOS/i.test(ua)) os = "Chromebook";

  return `${browser} on ${os}`;
}

export async function loginEmployee({ email, password }) {
  const { data } = await api.post("/api/employee/auth/login", {
    email,
    password,
    platform: "web",
    deviceName: getWebDeviceName(),
  });

  if (!data?.success) {
    throw new Error(data?.message || "Login failed");
  }

  return normalizeAuthPayload(data);
}

export async function refreshEmployeeToken(refreshToken) {
  const { data } = await api.post("/api/employee/auth/refresh", {
    refreshToken,
  });

  if (!data?.success) {
    throw new Error(data?.message || "Session expired");
  }

  return normalizeAuthPayload(data);
}

export async function logoutEmployee() {
  try {
    await api.post("/api/employee/auth/logout");
  } catch {
    // Clear local session even if API logout fails.
  }
}

let authMePromise = null;

export async function getAuthMe() {
  if (authMePromise) return authMePromise;

  authMePromise = (async () => {
    try {
      const { data } = await api.get("/api/employee/auth/me");
      if (!data?.success) {
        throw new Error(data?.message || "Failed to load profile");
      }
      return data.data || data;
    } finally {
      authMePromise = null;
    }
  })();

  return authMePromise;
}

export async function updateAuthProfile(payload) {
  const { data } = await api.patch("/api/employee/auth/profile", payload);
  if (!data?.success) {
    throw new Error(data?.message || "Failed to update profile");
  }
  return data.data || data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await api.put("/api/employee/auth/change-password", {
    currentPassword,
    newPassword,
  });
  if (!data?.success) {
    throw new Error(data?.message || "Failed to change password");
  }
  return data;
}

export async function forgotPassword({ email }) {
  const { data } = await api.post("/api/employee/auth/forgot-password", {
    email,
  });
  if (!data?.success) {
    throw new Error(data?.message || "Failed to send reset email");
  }
  return data;
}

export async function resetPassword(payload) {
  const { data } = await api.post("/api/employee/auth/reset-password", payload);
  if (!data?.success) {
    throw new Error(data?.message || "Failed to reset password");
  }
  return data;
}

/**
 * Upload photo via portal upload + profile PATCH.
 * Kept for AuthProvider compatibility.
 */
export { uploadPortalProfilePhoto as uploadProfilePhoto } from "@/api/portal";
