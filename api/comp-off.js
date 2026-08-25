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

export function normalizeCompOffRow(row) {
  if (!row || typeof row !== "object") return null;
  const compOffId = pick(row.compOffId, row.requestId, row.id);
  return {
    ...row,
    compOffId,
    requestId: compOffId,
    id: compOffId,
    employeeId: pick(row.employeeId) || null,
    workDate: toDateKey(row.workDate) || row.workDate,
    compOffDate: toDateKey(row.compOffDate) || row.compOffDate || null,
    hoursWorked:
      row.hoursWorked != null && row.hoursWorked !== ""
        ? Number(row.hoursWorked)
        : null,
    reason: row.reason || "",
    status: String(row.status || "").toLowerCase() || "pending",
    statusLabel: row.statusLabel || null,
    currentLevel: row.currentLevel ?? null,
    totalLevels: row.totalLevels ?? null,
    levelName: row.levelName || null,
    reviewedBy: row.reviewedBy || null,
    reviewedAt: row.reviewedAt || null,
    usedDate: toDateKey(row.usedDate) || row.usedDate || null,
    createdAt: row.createdAt || null,
  };
}

/**
 * Own comp-off requests.
 * GET /api/employee/portal/comp-off?status=&page=&limit=
 * status "cancelled" also includes rejected (single Cancelled filter).
 */
export async function listCompOffRequests({
  status,
  page = 1,
  limit = 10,
} = {}) {
  try {
    if (status === "cancelled") {
      const fetchLimit = Math.max(limit * page, 50);
      const [cancelledRes, rejectedRes] = await Promise.all([
        api.get("/api/employee/portal/comp-off", {
          params: { status: "cancelled", page: 1, limit: fetchLimit },
        }),
        api.get("/api/employee/portal/comp-off", {
          params: { status: "rejected", page: 1, limit: fetchLimit },
        }),
      ]);
      const cancelledBody = unwrap(
        cancelledRes.data,
        "Failed to load comp-off requests"
      );
      const rejectedBody = unwrap(
        rejectedRes.data,
        "Failed to load comp-off requests"
      );
      const map = new Map();
      for (const row of [
        ...(Array.isArray(cancelledBody.data) ? cancelledBody.data : []),
        ...(Array.isArray(rejectedBody.data) ? rejectedBody.data : []),
      ]) {
        const normalized = normalizeCompOffRow(row);
        if (!normalized) continue;
        const id = normalized.compOffId || JSON.stringify(normalized);
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

    const { data } = await api.get("/api/employee/portal/comp-off", {
      params,
    });
    const body = unwrap(data, "Failed to load comp-off requests");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeCompOffRow)
      .filter(Boolean);

    return {
      rows,
      meta: body.meta || { total: 0, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load comp-off requests");
  }
}

/**
 * Submit a comp-off request.
 * POST /api/employee/portal/comp-off
 * Body: { workDate, hoursWorked, reason }
 */
export async function createCompOffRequest(payload) {
  try {
    const { data } = await api.post("/api/employee/portal/comp-off", payload);
    return unwrap(data, "Failed to submit comp-off request");
  } catch (err) {
    throw toApiError(err, "Failed to submit comp-off request");
  }
}

/**
 * Cancel own pending comp-off request.
 * PATCH /api/employee/portal/comp-off/{compOffId}/cancel
 */
export async function cancelCompOffRequest(compOffId) {
  const id =
    compOffId?.compOffId ||
    compOffId?.requestId ||
    compOffId?.id ||
    compOffId;
  if (!id) {
    const err = new Error("Missing comp-off request id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.patch(
      `/api/employee/portal/comp-off/${id}/cancel`
    );
    return unwrap(data, "Failed to cancel request");
  } catch (err) {
    throw toApiError(err, "Failed to cancel request");
  }
}
