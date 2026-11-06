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

function personName(row, keys) {
  const direct = pick(...keys.map((key) => row?.[key]));
  if (direct) return String(direct);
  return null;
}

function joinName(...parts) {
  const name = parts
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean)
    .join(" ");
  return name || null;
}

export function normalizeShiftSwapRow(row) {
  if (!row || typeof row !== "object") return null;
  const requestId = pick(row.requestId, row.id, row.shiftSwapId);
  const requester = row.requester && typeof row.requester === "object" ? row.requester : {};
  const peer = row.peer && typeof row.peer === "object" ? row.peer : {};
  const fromDate = toDateKey(
    pick(row.fromDate, row.startDate, row.swapDate, row.effectiveDate, row.requestDate, row.date)
  );
  const toDate = toDateKey(
    pick(row.toDate, row.endDate, row.swapDate, row.effectiveDate, fromDate)
  );

  return {
    ...row,
    requestId,
    id: requestId,
    fromDate: fromDate || pick(row.fromDate, row.startDate),
    toDate: toDate || pick(row.toDate, row.endDate, fromDate),
    swapDate: fromDate || pick(row.swapDate, row.effectiveDate),
    reason: row.reason || "",
    status: String(row.status || "").toLowerCase() || "pending",
    statusLabel: row.statusLabel || null,
    myRole: pick(row.myRole, row.role, row.viewerRole, row.participation),
    isRequester: row.isRequester === true || row.asRequester === true,
    isPeer: row.isPeer === true || row.asPeer === true,
    requesterEmployeeId: pick(
      row.requesterEmployeeId,
      row.requesterId,
      requester.employeeId,
      requester.id
    ),
    requesterName:
      personName(row, [
        "requesterName",
        "requesterEmployeeName",
        "employeeName",
        "requestedByName",
      ]) ||
      joinName(row.requesterFirstName, row.requesterLastName) ||
      joinName(requester.firstName, requester.lastName) ||
      pick(requester.employeeName, requester.fullName, requester.name),
    requesterCode: pick(
      row.requesterEmployeeCode,
      row.requesterCode,
      requester.employeeCode,
      requester.code
    ),
    peerEmployeeId: pick(
      row.peerEmployeeId,
      row.targetEmployeeId,
      row.swapWithEmployeeId,
      peer.employeeId,
      peer.id
    ),
    peerName:
      personName(row, [
        "peerName",
        "peerEmployeeName",
        "targetEmployeeName",
        "swapWithName",
      ]) ||
      joinName(row.peerFirstName, row.peerLastName) ||
      joinName(peer.firstName, peer.lastName) ||
      pick(peer.employeeName, peer.fullName, peer.name),
    peerCode: pick(
      row.peerEmployeeCode,
      row.peerCode,
      row.targetEmployeeCode,
      peer.employeeCode,
      peer.code
    ),
    requesterShiftName: pick(
      row.requesterShiftName,
      row.myShiftName,
      row.fromShiftName,
      row.currentShiftName
    ),
    peerShiftName: pick(
      row.peerShiftName,
      row.targetShiftName,
      row.toShiftName,
      row.requestedShiftName
    ),
    requesterShiftType: pick(row.requesterShiftType, row.fromShiftType),
    peerShiftType: pick(row.peerShiftType, row.toShiftType),
    peerStatus: pick(row.peerStatus)
      ? String(pick(row.peerStatus)).toLowerCase()
      : null,
    peerDecidedAt: row.peerDecidedAt || null,
    peerComments: pick(row.peerComments, row.peerComment, row.decisionComments),
    comments: row.comments || "",
    currentLevel: row.currentLevel ?? null,
    totalLevels: row.totalLevels ?? null,
    levelName: pick(row.levelName, row.currentLevelName, row.approvalLevelName),
    createdAt: row.createdAt || row.submittedAt || null,
    reviewedBy: row.reviewedBy || null,
    reviewedAt: row.reviewedAt || null,
  };
}

/**
 * Own shift-swap requests (as requester or peer).
 * GET /api/employee/portal/shift-swap?status=&page=&limit=
 */
export async function listShiftSwapRequests({
  status,
  page = 1,
  limit = 10,
} = {}) {
  try {
    const params = { page, limit };
    if (status && status !== "all") params.status = status;

    const { data } = await api.get("/api/employee/portal/shift-swap", {
      params,
    });
    const body = unwrap(data, "Failed to load shift-swap requests");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeShiftSwapRow)
      .filter(Boolean);

    return {
      rows,
      meta: body.meta || { total: 0, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load shift-swap requests");
  }
}

/**
 * Submit a shift-swap request. Peer must accept, then company approval.
 * POST /api/employee/portal/shift-swap
 * Body: { peerEmployeeId, fromDate, toDate, reason }
 */
export async function createShiftSwapRequest(payload) {
  try {
    const { data } = await api.post("/api/employee/portal/shift-swap", payload);
    return unwrap(data, "Failed to submit shift-swap request");
  } catch (err) {
    throw toApiError(err, "Failed to submit shift-swap request");
  }
}

/**
 * Cancel own open shift-swap request (requester only).
 * PATCH /api/employee/portal/shift-swap/{requestId}/cancel
 */
export async function cancelShiftSwapRequest(requestId) {
  const id =
    requestId?.requestId || requestId?.id || requestId?.shiftSwapId || requestId;
  if (!id) {
    const err = new Error("Missing shift-swap request id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.patch(
      `/api/employee/portal/shift-swap/${id}/cancel`
    );
    return unwrap(data, "Failed to cancel request");
  } catch (err) {
    throw toApiError(err, "Failed to cancel request");
  }
}

/**
 * Peer accept or reject a pending_peer shift swap.
 * POST /api/employee/portal/shift-swap/{requestId}/peer-decision
 * Body: { action: "accepted" | "rejected", comments? }
 */
export async function decideShiftSwapPeer(requestId, payload) {
  const id =
    requestId?.requestId || requestId?.id || requestId?.shiftSwapId || requestId;
  if (!id) {
    const err = new Error("Missing shift-swap request id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/shift-swap/${id}/peer-decision`,
      payload
    );
    return unwrap(data, "Failed to record peer decision");
  } catch (err) {
    throw toApiError(err, "Failed to record peer decision");
  }
}

function normalizeSwapPeer(row) {
  if (!row || typeof row !== "object") return null;
  const employeeId = pick(row.recno, row.employeeId, row.id, row.peerEmployeeId);
  if (!employeeId) return null;
  return {
    employeeId: String(employeeId),
    employeeName:
      pick(row.text, row.employeeName, row.fullName, row.name) || "Colleague",
    employeeCode: pick(row.employeeCode, row.code, row.empCode),
    designation: pick(row.designation, row.designationName, row.jobTitle),
    shiftName: pick(row.shiftName, row.currentShiftName),
  };
}

/** In-flight / short cache — avoids Strict Mode + remount double calls. */
let swapPeersCache = null;
let swapPeersPromise = null;

/**
 * Active colleagues for the shift-swap peer picker (excludes self).
 * GET /api/employee/portal/dropdowns/swap-peers
 */
export async function listSwapPeers({ force = false } = {}) {
  if (!force && swapPeersCache) return swapPeersCache;
  if (!force && swapPeersPromise) return swapPeersPromise;

  swapPeersPromise = (async () => {
    const { data } = await api.get("/api/employee/portal/dropdowns/swap-peers");
    const body = unwrap(data, "Failed to load colleagues");
    const raw = Array.isArray(body.data) ? body.data : [];
    swapPeersCache = raw.map(normalizeSwapPeer).filter(Boolean);
    return swapPeersCache;
  })();

  try {
    return await swapPeersPromise;
  } catch (err) {
    swapPeersPromise = null;
    throw toApiError(err, "Failed to load colleagues");
  } finally {
    swapPeersPromise = null;
  }
}
