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

function toDateKey(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Normalize GET /api/employee/portal/shift payload.
 */
export function normalizeMyShift(raw) {
  if (!raw || typeof raw !== "object") return null;

  const hasShift =
    raw.hasShift === true ||
    Boolean(raw.shiftId) ||
    Boolean(raw.shiftName);

  if (!hasShift && raw.hasShift === false) {
    return {
      hasShift: false,
      employeeId: raw.employeeId || null,
      employeeCode: raw.employeeCode || null,
      shiftId: null,
      shiftName: null,
      shiftType: null,
      shiftTypeRaw: null,
      startTime: null,
      endTime: null,
      lateInGracePeriodMinutes: 0,
      earlyOutGracePeriodMinutes: 0,
      source: raw.source || null,
      effectiveFrom: null,
      effectiveTo: null,
      raw,
    };
  }

  const shiftTypeRaw = raw.shiftType || null;

  return {
    hasShift: true,
    employeeId: raw.employeeId || null,
    employeeCode: raw.employeeCode || null,
    shiftId: raw.shiftId || null,
    shiftName: raw.shiftName || "Shift",
    shiftType: shiftTypeRaw
      ? String(shiftTypeRaw).replace(/_/g, " ")
      : null,
    shiftTypeRaw,
    startTime: raw.startTime || null,
    endTime: raw.endTime || null,
    lateInGracePeriodMinutes: Number(raw.lateInGracePeriodMinutes || 0),
    earlyOutGracePeriodMinutes: Number(raw.earlyOutGracePeriodMinutes || 0),
    source: raw.source || null,
    effectiveFrom: toDateKey(raw.effectiveFrom),
    effectiveTo: toDateKey(raw.effectiveTo),
    raw,
  };
}

/**
 * Own currently assigned shift details.
 * GET /api/employee/portal/shift
 */
export async function getMyShift() {
  try {
    const { data } = await api.get("/api/employee/portal/shift");
    const body = unwrap(data, "Failed to load current shift");
    return normalizeMyShift(body.data);
  } catch (err) {
    throw toApiError(err, "Failed to load current shift");
  }
}
