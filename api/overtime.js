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

export function normalizeOvertimeRow(row) {
  if (!row || typeof row !== "object") return null;
  const otRequestId = pick(row.otRequestId, row.requestId, row.id);
  return {
    ...row,
    otRequestId,
    requestId: otRequestId,
    id: otRequestId,
    employeeId: pick(row.employeeId) || null,
    logId: pick(row.logId) || null,
    attendanceDate:
      toDateKey(row.attendanceDate) || row.attendanceDate || null,
    overtimeMinutes:
      row.overtimeMinutes != null && row.overtimeMinutes !== ""
        ? Number(row.overtimeMinutes)
        : null,
    reason: row.reason || "",
    status: String(row.status || "").toLowerCase() || "pending",
    statusLabel: row.statusLabel || null,
    currentLevel: row.currentLevel ?? null,
    totalLevels: row.totalLevels ?? null,
    levelName: row.levelName || null,
    reviewedBy: row.reviewedBy || null,
    reviewedAt: row.reviewedAt || null,
    createdAt: row.createdAt || null,
  };
}

/**
 * Own overtime requests.
 * GET /api/employee/portal/overtime?status=&page=&limit=
 * status "cancelled" also includes rejected (single Cancelled filter).
 */
export async function listOvertimeRequests({
  status,
  page = 1,
  limit = 10,
} = {}) {
  try {
    if (status === "cancelled") {
      const fetchLimit = Math.max(limit * page, 50);
      const [cancelledRes, rejectedRes] = await Promise.all([
        api.get("/api/employee/portal/overtime", {
          params: { status: "cancelled", page: 1, limit: fetchLimit },
        }),
        api.get("/api/employee/portal/overtime", {
          params: { status: "rejected", page: 1, limit: fetchLimit },
        }),
      ]);
      const cancelledBody = unwrap(
        cancelledRes.data,
        "Failed to load overtime requests"
      );
      const rejectedBody = unwrap(
        rejectedRes.data,
        "Failed to load overtime requests"
      );
      const map = new Map();
      for (const row of [
        ...(Array.isArray(cancelledBody.data) ? cancelledBody.data : []),
        ...(Array.isArray(rejectedBody.data) ? rejectedBody.data : []),
      ]) {
        const normalized = normalizeOvertimeRow(row);
        if (!normalized) continue;
        const id = normalized.otRequestId || JSON.stringify(normalized);
        map.set(id, normalized);
      }
      const merged = Array.from(map.values()).sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return tb - ta;
      });
      const total = merged.length;
      const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
      const start = (page - 1) * limit;
      return {
        rows: merged.slice(start, start + limit),
        meta: { total, page, limit, totalPages },
      };
    }

    const params = { page, limit };
    if (status && status !== "all") params.status = status;

    const { data } = await api.get("/api/employee/portal/overtime", {
      params,
    });
    const body = unwrap(data, "Failed to load overtime requests");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeOvertimeRow)
      .filter(Boolean);

    return {
      rows,
      meta: body.meta || { total: 0, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load overtime requests");
  }
}

/**
 * Submit an overtime request.
 * POST /api/employee/portal/overtime
 * Body: { attendanceDate, overtimeMinutes, reason, logId }
 */
export async function createOvertimeRequest(payload) {
  try {
    const { data } = await api.post("/api/employee/portal/overtime", payload);
    return unwrap(data, "Failed to submit overtime request");
  } catch (err) {
    throw toApiError(err, "Failed to submit overtime request");
  }
}

/**
 * Cancel own pending overtime request.
 * PATCH /api/employee/portal/overtime/{requestId}/cancel
 */
export async function cancelOvertimeRequest(requestId) {
  const id =
    requestId?.otRequestId ||
    requestId?.requestId ||
    requestId?.id ||
    requestId;
  if (!id) {
    const err = new Error("Missing overtime request id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.patch(
      `/api/employee/portal/overtime/${id}/cancel`
    );
    return unwrap(data, "Failed to cancel request");
  } catch (err) {
    throw toApiError(err, "Failed to cancel request");
  }
}
