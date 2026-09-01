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

function normalizeInstallment(row) {
  if (!row || typeof row !== "object") return null;
  return {
    ...row,
    installmentId: pick(row.installmentId, row.id),
    installmentNo: row.installmentNo ?? null,
    dueMonth: toDateKey(row.dueMonth) || row.dueMonth || null,
    amount: row.amount != null ? Number(row.amount) : null,
    status: String(row.status || "").toLowerCase() || "pending",
    paidAt: row.paidAt || null,
    remarks: row.remarks || "",
  };
}

export function normalizeLoanRow(row) {
  if (!row || typeof row !== "object") return null;
  const loanId = pick(row.loanId, row.requestId, row.id);
  const installments = (Array.isArray(row.installments) ? row.installments : [])
    .map(normalizeInstallment)
    .filter(Boolean)
    .sort((a, b) => (a.installmentNo || 0) - (b.installmentNo || 0));

  return {
    ...row,
    loanId,
    requestId: loanId,
    id: loanId,
    employeeId: pick(row.employeeId) || null,
    loanAmount: row.loanAmount != null ? Number(row.loanAmount) : null,
    approvedAmount:
      row.approvedAmount != null ? Number(row.approvedAmount) : null,
    installmentAmount:
      row.installmentAmount != null ? Number(row.installmentAmount) : null,
    installments,
    installmentCount: installments.length || row.installments?.length || null,
    totalRecovered:
      row.totalRecovered != null ? Number(row.totalRecovered) : null,
    totalPaid: row.totalPaid != null ? Number(row.totalPaid) : null,
    totalPending: row.totalPending != null ? Number(row.totalPending) : null,
    startMonth: toDateKey(row.startMonth) || row.startMonth || null,
    reason: row.reason || "",
    status: String(row.status || "").toLowerCase() || "pending",
    statusLabel: row.statusLabel || null,
    currentLevel: row.currentLevel ?? null,
    totalLevels: row.totalLevels ?? null,
    levelName: row.levelName || null,
    createdAt: row.createdAt || null,
  };
}

/**
 * Own loan applications and installment schedule.
 * GET /api/employee/portal/loans?status=&page=&limit=
 */
export async function listLoansRequests({
  status,
  page = 1,
  limit = 10,
} = {}) {
  try {
    if (status === "cancelled") {
      const fetchLimit = Math.max(limit * page, 50);
      const [cancelledRes, rejectedRes] = await Promise.all([
        api.get("/api/employee/portal/loans", {
          params: { status: "cancelled", page: 1, limit: fetchLimit },
        }),
        api.get("/api/employee/portal/loans", {
          params: { status: "rejected", page: 1, limit: fetchLimit },
        }),
      ]);
      const cancelledBody = unwrap(
        cancelledRes.data,
        "Failed to load loan requests"
      );
      const rejectedBody = unwrap(
        rejectedRes.data,
        "Failed to load loan requests"
      );
      const map = new Map();
      for (const row of [
        ...(Array.isArray(cancelledBody.data) ? cancelledBody.data : []),
        ...(Array.isArray(rejectedBody.data) ? rejectedBody.data : []),
      ]) {
        const normalized = normalizeLoanRow(row);
        if (!normalized) continue;
        const id = normalized.loanId || JSON.stringify(normalized);
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

    const { data } = await api.get("/api/employee/portal/loans", { params });
    const body = unwrap(data, "Failed to load loan requests");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeLoanRow)
      .filter(Boolean);

    return {
      rows,
      meta: body.meta || { total: 0, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load loan requests");
  }
}

/**
 * Apply for a loan.
 * POST /api/employee/portal/loans
 * Body: { loanAmount, installments, startMonth, reason }
 */
export async function createLoanRequest(payload) {
  try {
    const { data } = await api.post("/api/employee/portal/loans", payload);
    return unwrap(data, "Failed to submit loan request");
  } catch (err) {
    throw toApiError(err, "Failed to submit loan request");
  }
}

/**
 * Cancel own pending loan application.
 * POST /api/employee/portal/loans/{loanId}/cancel
 */
export async function cancelLoanRequest(requestId) {
  const id =
    requestId?.loanId || requestId?.requestId || requestId?.id || requestId;
  if (!id) {
    const err = new Error("Missing loan request id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/loans/${id}/cancel`
    );
    return unwrap(data, "Failed to cancel request");
  } catch (err) {
    throw toApiError(err, "Failed to cancel request");
  }
}
