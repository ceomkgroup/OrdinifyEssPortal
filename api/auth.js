import api from "@/lib/axios";
import { normalizeAuthPayload } from "@/lib/auth-storage";

export async function loginEmployee({ email, password }) {
  const { data } = await api.post("/api/employee/auth/login", {
    email,
    password,
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

export async function getAuthMe() {
  const { data } = await api.get("/api/employee/auth/me");
  if (!data?.success) {
    throw new Error(data?.message || "Failed to load profile");
  }
  return data.data || data;
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
 * Upload photo via PATCH /api/employee/auth/profile (multipart).
 */
export async function uploadProfilePhoto(file) {
  const form = new FormData();
  form.append("photo", file);

  const { data } = await api.patch("/api/employee/auth/profile", form);
  if (!data?.success) {
    throw new Error(data?.message || "Failed to upload photo");
  }
  return data.data || data;
}
