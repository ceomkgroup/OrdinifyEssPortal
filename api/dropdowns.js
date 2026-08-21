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

function pick(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    return value;
  }
  return null;
}

function normalizeAttendanceType(row) {
  if (!row || typeof row !== "object") return null;
  const id = pick(row.recno, row.id, row.attendanceTypeId);
  const text = pick(row.text, row.name, row.attTypeName) || "Type";
  const code = String(pick(row.code, row.attTypeCode) || "")
    .trim()
    .toUpperCase();
  if (!id && !code) return null;
  return {
    id,
    text,
    code,
    colorCode: pick(row.colorCode, row.color) || null,
    /** Stable filter value: prefer code, else id */
    key: code || id,
  };
}

let attendanceTypesCache = null;
let attendanceTypesPromise = null;

/**
 * Attendance types dropdown (filters, badges, colors).
 * GET /api/employee/portal/dropdowns/attendance-types
 */
export async function getAttendanceTypesDropdown({ force = false } = {}) {
  if (!force && attendanceTypesCache) return attendanceTypesCache;
  if (!force && attendanceTypesPromise) return attendanceTypesPromise;

  attendanceTypesPromise = (async () => {
    const { data } = await api.get(
      "/api/employee/portal/dropdowns/attendance-types"
    );
    const body = unwrap(data, "Failed to load attendance types");
    const raw = Array.isArray(body.data) ? body.data : [];
    attendanceTypesCache = raw.map(normalizeAttendanceType).filter(Boolean);
    return attendanceTypesCache;
  })();

  try {
    return await attendanceTypesPromise;
  } catch (err) {
    attendanceTypesPromise = null;
    throw toApiError(err, "Failed to load attendance types");
  } finally {
    attendanceTypesPromise = null;
  }
}

export function clearAttendanceTypesCache() {
  attendanceTypesCache = null;
  attendanceTypesPromise = null;
}

function normalizeLeaveType(row) {
  if (!row || typeof row !== "object") return null;
  const id = pick(row.recno, row.id, row.leaveTypeId);
  const text = pick(row.text, row.name, row.leaveTypeName) || "Leave type";
  if (!id) return null;
  return {
    id,
    leaveTypeId: id,
    text,
    leaveTypeName: text,
    leavesAllowed: row.leavesAllowed ?? null,
    maxLeavesAllowed: row.maxLeavesAllowed ?? null,
    minDuration: row.minDuration ?? null,
    maxDuration: row.maxDuration ?? null,
    advanceNoticeDays: row.advanceNoticeDays ?? null,
    allowNegativeBalance: Boolean(row.allowNegativeBalance),
    genderRestriction: row.genderRestriction ?? null,
  };
}

let leaveTypesCache = null;
let leaveTypesPromise = null;

/**
 * Leave types dropdown (apply form, filters, labels).
 * GET /api/employee/portal/dropdowns/leave-types
 */
export async function getLeaveTypesDropdown({ force = false } = {}) {
  if (!force && leaveTypesCache) return leaveTypesCache;
  if (!force && leaveTypesPromise) return leaveTypesPromise;

  leaveTypesPromise = (async () => {
    const { data } = await api.get(
      "/api/employee/portal/dropdowns/leave-types"
    );
    const body = unwrap(data, "Failed to load leave types");
    const raw = Array.isArray(body.data) ? body.data : [];
    leaveTypesCache = raw.map(normalizeLeaveType).filter(Boolean);
    return leaveTypesCache;
  })();

  try {
    return await leaveTypesPromise;
  } catch (err) {
    leaveTypesPromise = null;
    throw toApiError(err, "Failed to load leave types");
  } finally {
    leaveTypesPromise = null;
  }
}

export function clearLeaveTypesCache() {
  leaveTypesCache = null;
  leaveTypesPromise = null;
}
