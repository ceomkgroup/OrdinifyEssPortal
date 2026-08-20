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

/** Normalize leave request id from list/create payloads. */
export function resolveLeaveRequestId(rowOrId) {
  if (rowOrId == null) return "";
  if (typeof rowOrId === "string" || typeof rowOrId === "number") {
    return String(rowOrId);
  }
  return String(
    rowOrId.requestId ||
      rowOrId.id ||
      rowOrId.leaveRequestId ||
      rowOrId.request_id ||
      ""
  );
}

function normalizeLeaveRequest(row) {
  if (!row || typeof row !== "object") return row;
  const requestId = resolveLeaveRequestId(row);
  return requestId ? { ...row, requestId } : { ...row };
}

/**
 * Own leave balance / quota per leave type.
 * GET /api/employee/portal/leave/balance?fiscalYear=
 */
export async function getLeaveBalance({ fiscalYear } = {}) {
  try {
    const params = {};
    if (fiscalYear != null) params.fiscalYear = fiscalYear;
    const { data } = await api.get("/api/employee/portal/leave/balance", {
      params,
    });
    const body = unwrap(data, "Failed to load leave balance");
    return Array.isArray(body.data) ? body.data : [];
  } catch (err) {
    throw toApiError(err, "Failed to load leave balance");
  }
}

/**
 * Own leave requests (paginated).
 * GET /api/employee/portal/leave/requests?status=&page=&limit=
 * status "cancelled" also includes rejected (UI Cancel filter).
 */
export async function listLeaveRequests({
  status,
  page = 1,
  limit = 10,
} = {}) {
  try {
    // Cancel tab = cancelled + rejected
    if (status === "cancelled") {
      const fetchLimit = Math.max(limit * page, 50);
      const [cancelledRes, rejectedRes] = await Promise.all([
        api.get("/api/employee/portal/leave/requests", {
          params: { status: "cancelled", page: 1, limit: fetchLimit },
        }),
        api.get("/api/employee/portal/leave/requests", {
          params: { status: "rejected", page: 1, limit: fetchLimit },
        }),
      ]);
      const cancelledBody = unwrap(
        cancelledRes.data,
        "Failed to load leave requests"
      );
      const rejectedBody = unwrap(
        rejectedRes.data,
        "Failed to load leave requests"
      );
      const map = new Map();
      for (const row of [
        ...(Array.isArray(cancelledBody.data) ? cancelledBody.data : []),
        ...(Array.isArray(rejectedBody.data) ? rejectedBody.data : []),
      ]) {
        const normalized = normalizeLeaveRequest(row);
        const id = resolveLeaveRequestId(normalized);
        if (id) map.set(id, normalized);
        else map.set(JSON.stringify(normalized), normalized);
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
    const { data } = await api.get("/api/employee/portal/leave/requests", {
      params,
    });
    const body = unwrap(data, "Failed to load leave requests");
    const rows = (Array.isArray(body.data) ? body.data : []).map(
      normalizeLeaveRequest
    );
    return {
      rows,
      meta: body.meta || { total: 0, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load leave requests");
  }
}

/**
 * Submit a leave request.
 * POST /api/employee/portal/leave/requests
 */
export async function createLeaveRequest(payload) {
  try {
    const { data } = await api.post(
      "/api/employee/portal/leave/requests",
      payload
    );
    return unwrap(data, "Failed to submit leave request");
  } catch (err) {
    throw toApiError(err, "Failed to submit leave request");
  }
}

/**
 * Cancel own pending leave request.
 * Leave/encashment portal cancels use POST; attendance-change uses PATCH.
 * Tries POST first, then PATCH on 404/405.
 * POST|PATCH /api/employee/portal/leave/requests/{requestId}/cancel
 */
export async function cancelLeaveRequest(requestId) {
  const id = resolveLeaveRequestId(requestId);
  if (!id) {
    const err = new Error("Missing leave request id.");
    err.code = "MISSING_REQUEST_ID";
    throw err;
  }

  const url = `/api/employee/portal/leave/requests/${id}/cancel`;

  try {
    const { data } = await api.post(url, {});
    return unwrap(data, "Failed to cancel leave request");
  } catch (err) {
    const status = err?.status;
    if (status === 404 || status === 405) {
      try {
        const { data } = await api.patch(url, {});
        return unwrap(data, "Failed to cancel leave request");
      } catch (err2) {
        throw toApiError(err2, "Failed to cancel leave request");
      }
    }
    throw toApiError(err, "Failed to cancel leave request");
  }
}

/**
 * Own leave encashment requests.
 * GET /api/employee/portal/encashment
 * Returns disabled=true when encashment not enabled (403).
 */
export async function listEncashmentRequests({
  status,
  page = 1,
  limit = 10,
} = {}) {
  try {
    if (status === "cancelled") {
      const fetchLimit = Math.max(limit * page, 50);
      const [cancelledRes, rejectedRes] = await Promise.all([
        api.get("/api/employee/portal/encashment", {
          params: { status: "cancelled", page: 1, limit: fetchLimit },
        }),
        api.get("/api/employee/portal/encashment", {
          params: { status: "rejected", page: 1, limit: fetchLimit },
        }),
      ]);
      const cancelledBody = unwrap(
        cancelledRes.data,
        "Failed to load encashment requests"
      );
      const rejectedBody = unwrap(
        rejectedRes.data,
        "Failed to load encashment requests"
      );
      const map = new Map();
      for (const row of [
        ...(Array.isArray(cancelledBody.data) ? cancelledBody.data : []),
        ...(Array.isArray(rejectedBody.data) ? rejectedBody.data : []),
      ]) {
        const id =
          row.encashmentId || row.requestId || row.id || JSON.stringify(row);
        map.set(id, row);
      }
      const merged = Array.from(map.values());
      const total = merged.length;
      const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
      const start = (page - 1) * limit;
      return {
        rows: merged.slice(start, start + limit),
        meta: { total, page, limit, totalPages },
        disabled: false,
      };
    }

    const params = { page, limit };
    if (status && status !== "all") params.status = status;
    const { data } = await api.get("/api/employee/portal/encashment", {
      params,
    });
    const body = unwrap(data, "Failed to load encashment requests");
    return {
      rows: Array.isArray(body.data) ? body.data : [],
      meta: body.meta || { total: 0, page, limit, totalPages: 1 },
      disabled: false,
    };
  } catch (err) {
    const statusCode = err?.status;
    const message = String(err?.message || err?.data?.message || "");
    if (
      statusCode === 403 ||
      message.toLowerCase().includes("not enabled")
    ) {
      return {
        rows: [],
        meta: { total: 0, page, limit, totalPages: 0 },
        disabled: true,
        message:
          err?.data?.message ||
          message ||
          "Leave encashment is not enabled for this company",
      };
    }
    throw toApiError(err, "Failed to load encashment requests");
  }
}

/**
 * Apply for leave encashment.
 * POST /api/employee/portal/encashment
 */
export async function createEncashmentRequest(payload) {
  try {
    const { data } = await api.post(
      "/api/employee/portal/encashment",
      payload
    );
    return unwrap(data, "Failed to submit encashment request");
  } catch (err) {
    throw toApiError(err, "Failed to submit encashment request");
  }
}

/**
 * Cancel own pending encashment request.
 * POST /api/employee/portal/encashment/{encashmentId}/cancel
 */
export async function cancelEncashmentRequest(encashmentId) {
  const id = String(
    encashmentId?.encashmentId ||
      encashmentId?.id ||
      encashmentId?.requestId ||
      encashmentId ||
      ""
  );
  if (!id) {
    const err = new Error("Missing encashment request id.");
    err.code = "MISSING_ENCASHMENT_ID";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/encashment/${id}/cancel`,
      {}
    );
    return unwrap(data, "Failed to cancel encashment request");
  } catch (err) {
    const status = err?.status;
    if (status === 404 || status === 405) {
      try {
        const { data } = await api.patch(
          `/api/employee/portal/encashment/${id}/cancel`,
          {}
        );
        return unwrap(data, "Failed to cancel encashment request");
      } catch (err2) {
        throw toApiError(err2, "Failed to cancel encashment request");
      }
    }
    throw toApiError(err, "Failed to cancel encashment request");
  }
}
