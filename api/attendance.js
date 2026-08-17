import api from "@/lib/axios";

function unwrap(data, fallbackMessage) {
  if (!data?.success) {
    const err = new Error(data?.message || fallbackMessage);
    err.code = data?.code || data?.error;
    err.data = data?.data ?? data;
    throw err;
  }
  return data;
}

function toApiError(err, fallbackMessage) {
  if (err?.status || err?.code || err?.data) {
    const next = new Error(
      err?.data?.message || err.message || fallbackMessage
    );
    next.status = err.status;
    next.code = err.code || err.data?.code || err.data?.error;
    next.data = err.data?.data ?? err.data;
    return next;
  }
  return err;
}

/** Today's attendance log (null when not checked in). */
export async function getAttendanceToday() {
  const { data } = await api.get("/api/employee/portal/attendance/today");
  const body = unwrap(data, "Failed to load today's attendance");
  return {
    today: body.data ?? null,
    message: body.message || "",
  };
}

/** Monthly attendance summary */
export async function getAttendanceMonthlySummary({ year, month } = {}) {
  const now = new Date();
  const params = {
    year: year ?? now.getFullYear(),
    month: month ?? now.getMonth() + 1,
  };
  const { data } = await api.get(
    "/api/employee/portal/attendance/monthly-summary",
    { params }
  );
  return unwrap(data, "Failed to load monthly summary").data;
}

/** Paginated attendance history */
export async function getAttendanceHistory({
  from,
  to,
  page = 1,
  limit = 30,
} = {}) {
  const { data } = await api.get("/api/employee/portal/attendance/history", {
    params: { from, to, page, limit },
  });
  const body = unwrap(data, "Failed to load attendance history");
  return {
    rows: Array.isArray(body.data) ? body.data : [],
    meta: body.meta || { total: 0, page: 1, limit, totalPages: 1 },
  };
}

/**
 * Geofence config for punch.
 * Returns null when module disabled (400 MODULE_DISABLED).
 */
export async function getAttendanceGeofenceInfo() {
  try {
    const { data } = await api.get(
      "/api/employee/portal/attendance/geofence-info"
    );
    return unwrap(data, "Failed to load geofence info").data;
  } catch (err) {
    const code = err?.code || err?.data?.error || err?.data?.code;
    if (err?.status === 400 || code === "MODULE_DISABLED") {
      return null;
    }
    if (String(err?.message || "").toLowerCase().includes("not enabled")) {
      return null;
    }
    throw err;
  }
}

/**
 * POST check-in.
 * Body: punchSource, latitude?, longitude?, accuracy?, isMockProvider?, verificationToken?
 */
export async function checkInAttendance(payload) {
  try {
    const { data } = await api.post(
      "/api/employee/portal/attendance/check-in",
      payload
    );
    return unwrap(data, "Check-in failed");
  } catch (err) {
    throw toApiError(err, "Check-in failed");
  }
}

/**
 * PATCH check-out for today's log.
 * Path: /attendance/{logId}/check-out
 * Body: latitude?, longitude? (GPS only when geofence is active)
 */
export async function checkOutAttendance(logId, payload = {}) {
  if (!logId) {
    const err = new Error("Missing attendance log. Please refresh and try again.");
    err.code = "MISSING_LOG_ID";
    throw err;
  }

  try {
    const { data } = await api.patch(
      `/api/employee/portal/attendance/${logId}/check-out`,
      payload
    );
    return unwrap(data, "Check-out failed");
  } catch (err) {
    throw toApiError(err, "Check-out failed");
  }
}

/**
 * Start break (go on break).
 * PATCH /attendance/{logId}/break-out
 */
export async function breakOutAttendance(logId) {
  if (!logId) {
    const err = new Error("Missing attendance log. Please refresh and try again.");
    err.code = "MISSING_LOG_ID";
    throw err;
  }

  try {
    const { data } = await api.patch(
      `/api/employee/portal/attendance/${logId}/break-out`
    );
    return unwrap(data, "Unable to start break");
  } catch (err) {
    throw toApiError(err, "Unable to start break");
  }
}

/**
 * End break (return from break).
 * PATCH /attendance/{logId}/break-in
 */
export async function breakInAttendance(logId) {
  if (!logId) {
    const err = new Error("Missing attendance log. Please refresh and try again.");
    err.code = "MISSING_LOG_ID";
    throw err;
  }

  try {
    const { data } = await api.patch(
      `/api/employee/portal/attendance/${logId}/break-in`
    );
    return unwrap(data, "Unable to end break");
  } catch (err) {
    throw toApiError(err, "Unable to end break");
  }
}

/** Browser geolocation helper for punch */
export function getPunchGeoPosition({ timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const err = new Error(
        "GPS location is required to punch. Please enable location services on your device."
      );
      err.code = "GPS_REQUIRED";
      reject(err);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          isMockProvider: Boolean(pos.coords.isMockProvider),
        });
      },
      () => {
        const err = new Error(
          "GPS location is required to punch. Please enable location services on your device."
        );
        err.code = "GPS_REQUIRED";
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 0,
      }
    );
  });
}

export function formatPunchError(err) {
  const code = err?.code;
  const data = err?.data || {};
  const status = err?.status;
  const message = String(err?.message || "").toLowerCase();

  if (code === "OUTSIDE_GEOFENCE") {
    const distance = data.distanceMeters;
    const radius = data.allowedRadiusMeters;
    const place = data.workLocationName || "work location";
    if (distance != null && radius != null) {
      return `Outside geofence (${place}). You are ${Math.round(distance)}m away; allowed ${radius}m.`;
    }
    return err.message || `You are outside the ${place} geofence.`;
  }

  if (code === "MOCK_GPS_DETECTED") {
    return err.message || "Mock GPS detected. Disable fake location apps and try again.";
  }

  if (code === "GPS_REQUIRED") {
    return (
      err.message ||
      "GPS location is required to punch. Please enable location services on your device."
    );
  }

  if (code === "MISSING_LOG_ID") {
    return err.message || "Missing attendance log. Please refresh and try again.";
  }

  if (code === "PUNCH_NOT_PERMITTED") {
    return err.message || "Punch is not permitted for your account.";
  }

  if (code === "PUNCH_SOURCE_NOT_IN_PLAN") {
    return err.message || "This punch source is not included in your company plan.";
  }

  if (code === "MODULE_DISABLED") {
    return err.message || "This module is not enabled for your company.";
  }

  if (code === "INVALID_TRANSITION") {
    return err.message || "This action is not allowed in your current attendance state.";
  }

  if (
    code === "BREAK_LIMIT_EXCEEDED" ||
    code === "MAX_BREAKS_REACHED" ||
    code === "BREAK_QUOTA_EXCEEDED" ||
    code === "BREAK_MINUTES_EXCEEDED" ||
    message.includes("break limit") ||
    message.includes("maximum breaks") ||
    message.includes("no breaks remaining")
  ) {
    return err.message || "Break limit reached for today.";
  }

  if (status === 409 || message.includes("already checked out")) {
    return err.message || "Already checked out.";
  }

  if (status === 403 || message.includes("not your attendance log")) {
    return err.message || "Not your attendance log.";
  }

  return err?.message || "Unable to complete punch.";
}
