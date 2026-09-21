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

function pickNumber(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

const CORRECTION_WINDOW_KEYS = [
  "correctionWindowDays",
  "attendanceChangeWindowDays",
  "attendanceChangeDays",
  "changeWindowDays",
  "correctionDays",
  "attendanceCorrectionWindowDays",
  "maxCorrectionDays",
  "backdatedDays",
  "backDateLimitDays",
  "allowedPastDays",
  "requestWindowDays",
  "changeRequestWindowDays",
  "attendanceChangeRequestDays",
];

/**
 * How many past days an attendance change may cover.
 * Reads known policy/settings keys (including nested objects) so a later
 * backend rename still applies if one of these names is used.
 * Returns null when the company has not configured a window.
 */
export function pickCorrectionWindowDays(...sources) {
  for (const source of sources) {
    const n = readCorrectionWindowDays(source);
    if (n != null) return n;
  }
  return null;
}

function readCorrectionWindowDays(source, depth = 0) {
  if (source == null || depth > 4) return null;
  if (typeof source === "number") {
    return Number.isFinite(source) && source >= 0 ? source : null;
  }
  if (typeof source !== "object") return null;

  for (const key of CORRECTION_WINDOW_KEYS) {
    if (source[key] == null || source[key] === "") continue;
    const n = Number(source[key]);
    if (Number.isFinite(n) && n >= 0) return n;
  }

  for (const key of [
    "attendanceChange",
    "attendanceCorrection",
    "correction",
    "changeRequest",
    "policy",
  ]) {
    const nested = readCorrectionWindowDays(source[key], depth + 1);
    if (nested != null) return nested;
  }
  return null;
}

/**
 * Normalize merged attendance policy from
 * GET /api/employee/portal/attendance-policy
 */
export function normalizeAttendancePolicy(raw = {}) {
  const sources =
    raw.sources && typeof raw.sources === "object" ? raw.sources : {};

  return {
    lateAfterMinutes: pickNumber(raw.lateAfterMinutes),
    graceMinutes: pickNumber(raw.graceMinutes),
    halfDayAfterMinutes: pickNumber(raw.halfDayAfterMinutes),
    absentAfterMinutes: pickNumber(raw.absentAfterMinutes),
    minimumWorkingHours: pickNumber(raw.minimumWorkingHours),
    overtimeEnabled: Boolean(raw.overtimeEnabled),
    overtimeAfterHours: pickNumber(raw.overtimeAfterHours),
    allowBreaks: raw.allowBreaks !== false,
    maxBreakMinutes: pickNumber(raw.maxBreakMinutes),
    maxBreakCount: pickNumber(raw.maxBreakCount, raw.maxBreaks),
    maxBreaks: pickNumber(raw.maxBreakCount, raw.maxBreaks),
    paidBreaks: Boolean(raw.paidBreaks),
    earlyCheckoutPenalty: Boolean(raw.earlyCheckoutPenalty),
    holidayPolicy: {
      markHoliday: Boolean(raw.holidayPolicy?.markHoliday ?? true),
    },
    weekendPolicy: {
      markWeekend: Boolean(raw.weekendPolicy?.markWeekend ?? true),
    },
    autoCheckoutTime: raw.autoCheckoutTime || null,
    correctionWindowDays: pickCorrectionWindowDays(raw),
    sources: {
      company: Boolean(sources.company),
      department: Boolean(sources.department),
      shift: Boolean(sources.shift),
      employee: Boolean(sources.employee),
    },
    raw,
  };
}

let policyCache = null;
let policyCacheAt = 0;
let policyPromise = null;
const POLICY_TTL_MS = 5 * 60 * 1000;

/**
 * Fully resolved attendance policy (company + dept + shift + employee).
 * GET /api/employee/portal/attendance-policy
 * Shared cache + in-flight promise so Strict Mode / multi-mount don't double-hit.
 */
export async function getAttendancePolicy({ force = false } = {}) {
  const now = Date.now();
  if (!force && policyCache && now - policyCacheAt < POLICY_TTL_MS) {
    return policyCache;
  }
  if (!force && policyPromise) return policyPromise;

  policyPromise = (async () => {
    try {
      const { data } = await api.get("/api/employee/portal/attendance-policy");
      const body = unwrap(data, "Failed to load attendance policy");
      policyCache = normalizeAttendancePolicy(body.data || {});
      policyCacheAt = Date.now();
      return policyCache;
    } catch (err) {
      throw toApiError(err, "Failed to load attendance policy");
    } finally {
      policyPromise = null;
    }
  })();

  return policyPromise;
}

export function clearAttendancePolicyApiCache() {
  policyCache = null;
  policyCacheAt = 0;
  policyPromise = null;
}
