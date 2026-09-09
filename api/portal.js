import api from "@/lib/axios";
import { uploadEmployeePhoto } from "@/api/upload";
import { clearAttendancePolicyApiCache } from "@/api/attendance-policy";
import { clearAttendanceTypesCache, clearLeaveTypesCache } from "@/api/dropdowns";

let dashboardPromise = null;
let dashboardCache = null;
let dashboardCacheAt = 0;
const DASHBOARD_TTL_MS = 60_000;

let modulesPromise = null;
let modulesCache = null;

/**
 * Portal dashboard — memory-cached so format-only consumers
 * (holidays, requests, shift…) do not re-hit the network each mount.
 */
export async function getPortalDashboard({ force = false } = {}) {
  const now = Date.now();
  if (
    !force &&
    dashboardCache &&
    now - dashboardCacheAt < DASHBOARD_TTL_MS
  ) {
    return dashboardCache;
  }

  if (!force && dashboardPromise) {
    return dashboardPromise;
  }

  dashboardPromise = api
    .get("/api/employee/portal/dashboard")
    .then(({ data }) => {
      if (!data?.success) {
        throw new Error(data?.message || "Failed to load dashboard");
      }
      dashboardCache = data.data;
      dashboardCacheAt = Date.now();
      return dashboardCache;
    })
    .finally(() => {
      dashboardPromise = null;
    });

  return dashboardPromise;
}

export function clearDashboardCache() {
  dashboardPromise = null;
  dashboardCache = null;
  dashboardCacheAt = 0;
}

export async function getCompanySettings() {
  const dash = await getPortalDashboard();
  return dash?.companySettings || {};
}

export async function getCompanyModules({ force = false } = {}) {
  if (!force && modulesCache) return modulesCache;

  if (!modulesPromise) {
    modulesPromise = api
      .get("/api/employee/portal/company-modules")
      .then(({ data }) => {
        if (!data?.success) {
          throw new Error(data?.message || "Failed to load company modules");
        }
        modulesCache = data.data || {};
        return modulesCache;
      })
      .finally(() => {
        modulesPromise = null;
      });
  }

  return modulesPromise;
}

export function clearModulesCache() {
  modulesPromise = null;
  modulesCache = null;
}

export function clearPortalCaches() {
  clearDashboardCache();
  clearModulesCache();
  clearAttendancePolicyApiCache();
  clearAttendanceTypesCache();
  clearLeaveTypesCache();
}

export async function getPortalProfile() {
  const { data } = await api.get("/api/employee/portal/profile");
  if (!data?.success) {
    throw new Error(data?.message || "Failed to load profile");
  }
  return data.data || data;
}

/** PATCH only allowed self-service fields */
export async function updatePortalProfile(payload) {
  const { data } = await api.patch("/api/employee/portal/profile", payload);
  if (!data?.success) {
    throw new Error(data?.message || "Failed to update profile");
  }
  return data.data || data;
}

/**
 * Profile photo via generic upload, then save key on profile.
 * 1) POST /api/employee/portal/upload (FormType=employee_photo)
 * 2) PATCH /api/employee/portal/profile { photoUrl: key }
 */
export async function uploadPortalProfilePhoto(file, employeeId) {
  const uploaded = await uploadEmployeePhoto(file, employeeId);
  const photoKey = uploaded?.key;
  if (!photoKey) {
    throw new Error("Upload succeeded but no file key was returned.");
  }

  const { data } = await api.patch("/api/employee/portal/profile", {
    photoUrl: photoKey,
  });
  if (!data?.success) {
    throw new Error(data?.message || "Failed to save profile photo");
  }

  const profile = data.data || data;
  return {
    ...(typeof profile === "object" ? profile : {}),
    photoUrl: profile?.photoUrl || photoKey,
    photoUpload: uploaded,
  };
}
