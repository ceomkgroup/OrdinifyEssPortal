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

/**
 * List own attendance change requests.
 * GET /api/employee/portal/attendance-change
 */
export async function listAttendanceChangeRequests({
  status,
  page = 1,
  limit = 10,
} = {}) {
  try {
    const params = { page, limit };
    if (status && status !== "all") params.status = status;

    const { data } = await api.get("/api/employee/portal/attendance-change", {
      params,
    });
    const body = unwrap(data, "Failed to load attendance change requests");
    return {
      rows: Array.isArray(body.data) ? body.data : [],
      meta: body.meta || { total: 0, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load attendance change requests");
  }
}

/**
 * Get single attendance change request.
 * GET /api/employee/portal/attendance-change/{requestId}
 */
export async function getAttendanceChangeRequest(requestId) {
  try {
    const { data } = await api.get(
      `/api/employee/portal/attendance-change/${requestId}`
    );
    return unwrap(data, "Failed to load request").data;
  } catch (err) {
    throw toApiError(err, "Failed to load request");
  }
}

/**
 * Submit attendance correction request.
 * POST /api/employee/portal/attendance-change
 * Body: logId?, attendanceDate, checkInTime, checkOutTime, reason
 */
export async function createAttendanceChangeRequest(payload) {
  try {
    const { data } = await api.post(
      "/api/employee/portal/attendance-change",
      payload
    );
    return unwrap(data, "Failed to submit attendance change request");
  } catch (err) {
    throw toApiError(err, "Failed to submit attendance change request");
  }
}

/**
 * Cancel own pending attendance change request.
 * PATCH /api/employee/portal/attendance-change/{requestId}/cancel
 */
export async function cancelAttendanceChangeRequest(requestId) {
  try {
    const { data } = await api.patch(
      `/api/employee/portal/attendance-change/${requestId}/cancel`
    );
    return unwrap(data, "Failed to cancel request");
  } catch (err) {
    throw toApiError(err, "Failed to cancel request");
  }
}
