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

export function normalizeShiftChangeRow(row) {
  if (!row || typeof row !== "object") return null;
  const requestId = pick(row.requestId, row.id, row.shiftChangeId);
  return {
    ...row,
    requestId,
    id: requestId,
    currentShiftId: pick(row.currentShiftId, row.fromShiftId),
    requestedShiftId: pick(row.requestedShiftId, row.toShiftId, row.shiftId),
    currentShiftName: pick(
      row.currentShiftName,
      row.fromShiftName,
      row.currentShift?.shiftName
    ),
    requestedShiftName: pick(
      row.requestedShiftName,
      row.toShiftName,
      row.requestedShift?.shiftName,
      row.shiftName
    ),
    effectiveDate: toDateKey(row.effectiveDate) || row.effectiveDate,
    reason: row.reason || "",
    status: String(row.status || "").toLowerCase() || "pending",
    statusLabel: row.statusLabel || null,
    currentLevel: row.currentLevel ?? null,
    reviewedBy: row.reviewedBy || null,
    reviewedAt: row.reviewedAt || null,
    createdAt: row.createdAt || null,
  };
}

/**
 * Own shift-change requests.
 * GET /api/employee/portal/shift-change?status=&page=&limit=
 */
export async function listShiftChangeRequests({
  status,
  page = 1,
  limit = 10,
} = {}) {
  try {
    const params = { page, limit };
    if (status && status !== "all") params.status = status;

    const { data } = await api.get("/api/employee/portal/shift-change", {
      params,
    });
    const body = unwrap(data, "Failed to load shift-change requests");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeShiftChangeRow)
      .filter(Boolean);

    return {
      rows,
      meta: body.meta || { total: 0, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load shift-change requests");
  }
}

/**
 * Submit a shift-change request.
 * POST /api/employee/portal/shift-change
 * Body: { requestedShiftId, effectiveDate, reason }
 */
export async function createShiftChangeRequest(payload) {
  try {
    const { data } = await api.post(
      "/api/employee/portal/shift-change",
      payload
    );
    return unwrap(data, "Failed to submit shift-change request");
  } catch (err) {
    throw toApiError(err, "Failed to submit shift-change request");
  }
}

/**
 * Cancel own pending shift-change request.
 * PATCH /api/employee/portal/shift-change/{requestId}/cancel
 */
export async function cancelShiftChangeRequest(requestId) {
  const id =
    requestId?.requestId || requestId?.id || requestId?.shiftChangeId || requestId;
  if (!id) {
    const err = new Error("Missing shift-change request id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.patch(
      `/api/employee/portal/shift-change/${id}/cancel`
    );
    return unwrap(data, "Failed to cancel request");
  } catch (err) {
    throw toApiError(err, "Failed to cancel request");
  }
}

/** In-flight / short cache — avoids Strict Mode + remount double calls. */
let availableShiftsCache = null;
let availableShiftsPromise = null;

/**
 * Shifts dropdown for shift-change form.
 * GET /api/employee/portal/dropdowns/shifts
 * Items: { recno, text, shiftType, startTime, endTime }
 */
export async function listAvailableShifts({ force = false } = {}) {
  if (!force && availableShiftsCache) return availableShiftsCache;
  if (!force && availableShiftsPromise) return availableShiftsPromise;

  availableShiftsPromise = (async () => {
    const { data } = await api.get("/api/employee/portal/dropdowns/shifts");
    const body = unwrap(data, "Failed to load shifts");
    const raw = Array.isArray(body.data) ? body.data : [];
    availableShiftsCache = raw
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const shiftId = pick(row.recno, row.shiftId, row.id);
        if (!shiftId) return null;
        return {
          shiftId,
          shiftName: pick(row.text, row.shiftName, row.name) || "Shift",
          shiftType: pick(row.shiftType, row.type),
          startTime: pick(row.startTime, row.fromTime),
          endTime: pick(row.endTime, row.toTime),
        };
      })
      .filter(Boolean);
    return availableShiftsCache;
  })();

  try {
    return await availableShiftsPromise;
  } catch (err) {
    availableShiftsPromise = null;
    throw toApiError(err, "Failed to load shifts");
  } finally {
    availableShiftsPromise = null;
  }
}
