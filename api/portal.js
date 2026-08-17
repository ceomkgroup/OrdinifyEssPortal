import api from "@/lib/axios";

let dashboardPromise = null;
let modulesPromise = null;
let modulesCache = null;

export async function getPortalDashboard() {
  if (!dashboardPromise) {
    dashboardPromise = api
      .get("/api/employee/portal/dashboard")
      .then(({ data }) => {
        if (!data?.success) {
          throw new Error(data?.message || "Failed to load dashboard");
        }
        return data.data;
      })
      .finally(() => {
        setTimeout(() => {
          dashboardPromise = null;
        }, 0);
      });
  }

  return dashboardPromise;
}

export function clearDashboardCache() {
  dashboardPromise = null;
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

export async function uploadPortalProfilePhoto(file) {
  const form = new FormData();
  form.append("photo", file);
  const { data } = await api.patch("/api/employee/portal/profile", form);
  if (!data?.success) {
    throw new Error(data?.message || "Failed to upload photo");
  }
  return data.data || data;
}
