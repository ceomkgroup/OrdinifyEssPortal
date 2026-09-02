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
  const apiMessage =
    (err?.data && typeof err.data === "object" && err.data.message) ||
    err?.message ||
    fallbackMessage;
  const next = new Error(apiMessage);
  next.status = err?.status;
  next.code = err?.code || err?.data?.code || err?.data?.error;
  next.data = err?.data;
  return next;
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

function normalizeRecovery(row) {
  if (!row || typeof row !== "object") return null;
  return {
    ...row,
    recoveryId: pick(row.recoveryId, row.installmentId, row.id),
    installmentNo: row.installmentNo ?? row.recoveryNo ?? null,
    dueMonth: toDateKey(row.dueMonth || row.dueDate) || row.dueMonth || null,
    amount: row.amount != null ? Number(row.amount) : null,
    status: String(row.status || "").toLowerCase() || "pending",
    paidAt: row.paidAt || null,
    remarks: row.remarks || "",
  };
}

export function normalizeAdvanceRow(row) {
  if (!row || typeof row !== "object") return null;
  const advanceId = pick(row.advanceId, row.requestId, row.id);
  const recoveries = (Array.isArray(row.recoveries) ? row.recoveries : [])
    .map(normalizeRecovery)
    .filter(Boolean)
    .sort((a, b) => (a.installmentNo || 0) - (b.installmentNo || 0));

  return {
    ...row,
    advanceId,
    requestId: advanceId,
    id: advanceId,
    employeeId: pick(row.employeeId) || null,
    amount: row.amount != null ? Number(row.amount) : null,
    reason: row.reason || "",
    requestDate: toDateKey(row.requestDate) || row.requestDate || null,
    recoveryInstallments:
      row.recoveryInstallments != null
        ? Number(row.recoveryInstallments)
        : null,
    recoveryAmountPerMonth:
      row.recoveryAmountPerMonth != null
        ? Number(row.recoveryAmountPerMonth)
        : null,
    totalRecovered:
      row.totalRecovered != null ? Number(row.totalRecovered) : null,
    totalPaid: row.totalPaid != null ? Number(row.totalPaid) : null,
    totalPending: row.totalPending != null ? Number(row.totalPending) : null,
    recoveries,
    status: String(row.status || "").toLowerCase() || "pending",
    statusLabel: row.statusLabel || null,
    currentLevel: row.currentLevel ?? null,
    totalLevels: row.totalLevels ?? null,
    levelName: row.levelName || null,
    createdAt: row.createdAt || null,
  };
}

/**
 * Own salary advance applications and recovery schedule.
 * GET /api/employee/portal/advances?status=&page=&limit=
 */
export async function listAdvancesRequests({
  status,
  page = 1,
  limit = 10,
} = {}) {
  try {
    if (status === "cancelled") {
      const fetchLimit = Math.max(limit * page, 50);
      const [cancelledRes, rejectedRes] = await Promise.all([
        api.get("/api/employee/portal/advances", {
          params: { status: "cancelled", page: 1, limit: fetchLimit },
        }),
        api.get("/api/employee/portal/advances", {
          params: { status: "rejected", page: 1, limit: fetchLimit },
        }),
      ]);
      const cancelledBody = unwrap(
        cancelledRes.data,
        "Failed to load advance requests"
      );
      const rejectedBody = unwrap(
        rejectedRes.data,
        "Failed to load advance requests"
      );
      const map = new Map();
      for (const row of [
        ...(Array.isArray(cancelledBody.data) ? cancelledBody.data : []),
        ...(Array.isArray(rejectedBody.data) ? rejectedBody.data : []),
      ]) {
        const normalized = normalizeAdvanceRow(row);
        if (!normalized) continue;
        const id = normalized.advanceId || JSON.stringify(normalized);
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

    const { data } = await api.get("/api/employee/portal/advances", { params });
    const body = unwrap(data, "Failed to load advance requests");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeAdvanceRow)
      .filter(Boolean);

    return {
      rows,
      meta: body.meta || { total: 0, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load advance requests");
  }
}

/**
 * Apply for a salary advance.
 * POST /api/employee/portal/advances
 * Body: { amount, requestDate, reason, recoveryInstallments }
 */
export async function createAdvanceRequest(payload) {
  try {
    const { data } = await api.post("/api/employee/portal/advances", payload);
    return unwrap(data, "Failed to submit advance request");
  } catch (err) {
    throw toApiError(err, "Failed to submit advance request");
  }
}

/**
 * Cancel own pending salary advance application.
 * POST /api/employee/portal/advances/{advanceId}/cancel
 */
export async function cancelAdvanceRequest(requestId) {
  const id =
    requestId?.advanceId ||
    requestId?.requestId ||
    requestId?.id ||
    requestId;
  if (!id) {
    const err = new Error("Missing advance request id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/advances/${id}/cancel`
    );
    return unwrap(data, "Failed to cancel request");
  } catch (err) {
    throw toApiError(err, "Failed to cancel request");
  }
}
