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
    sources: {
      company: Boolean(sources.company),
      department: Boolean(sources.department),
      shift: Boolean(sources.shift),
      employee: Boolean(sources.employee),
    },
    raw,
  };
}

/**
 * Fully resolved attendance policy (company + dept + shift + employee).
 * GET /api/employee/portal/attendance-policy
 */
export async function getAttendancePolicy() {
  try {
    const { data } = await api.get("/api/employee/portal/attendance-policy");
    const body = unwrap(data, "Failed to load attendance policy");
    return normalizeAttendancePolicy(body.data || {});
  } catch (err) {
    throw toApiError(err, "Failed to load attendance policy");
  }
}
