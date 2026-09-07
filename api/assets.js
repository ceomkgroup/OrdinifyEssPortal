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

function displayName(person) {
  if (!person || typeof person !== "object") return "";
  return [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
}

export function normalizeAssetAssignment(row) {
  if (!row || typeof row !== "object") return null;
  const asset = row.asset && typeof row.asset === "object" ? row.asset : {};
  const assignmentId = pick(row.assignmentId, row.id);
  const assetId = pick(row.assetId, asset.assetId, asset.id);
  return {
    ...row,
    assignmentId,
    assetId,
    id: assignmentId || assetId,
    employeeId: pick(row.employeeId) || null,
    assignedDate: toDateKey(row.assignedDate) || row.assignedDate || null,
    expectedReturnDate:
      toDateKey(row.expectedReturnDate) || row.expectedReturnDate || null,
    returnDate: toDateKey(row.returnDate) || row.returnDate || null,
    checkoutCondition: row.checkoutCondition || "",
    returnCondition: row.returnCondition || "",
    remarks: row.remarks || "",
    acknowledgedAt: row.acknowledgedAt || null,
    status: String(row.status || "").toLowerCase() || "active",
    needsAcknowledgement: !row.acknowledgedAt,
    asset: {
      ...asset,
      assetId,
      assetTag: asset.assetTag || "",
      name: asset.name || "",
      description: asset.description || "",
      serialNumber: asset.serialNumber || "",
      imei: asset.imei || "",
      vendor: asset.vendor || "",
      invoiceNumber: asset.invoiceNumber || "",
      purchaseDate: toDateKey(asset.purchaseDate) || asset.purchaseDate || null,
      warrantyStart:
        toDateKey(asset.warrantyStart) || asset.warrantyStart || null,
      warrantyEnd: toDateKey(asset.warrantyEnd) || asset.warrantyEnd || null,
      status: String(asset.status || "").toLowerCase() || "",
      categoryName: asset.category?.name || asset.categoryName || "",
      categoryIcon: asset.category?.icon || "",
      purchasePrice: asset.purchasePrice ?? null,
      currentValue: asset.currentValue ?? null,
    },
  };
}

export function normalizeAssetHistory(row) {
  if (!row || typeof row !== "object") return null;
  const historyId = pick(row.historyId, row.id);
  const actorEmployee = row.actorEmployee || null;
  const actorUser = row.actorUser || null;
  return {
    ...row,
    historyId,
    id: historyId,
    assetId: pick(row.assetId) || null,
    action: String(row.action || "").toLowerCase() || "",
    remarks: row.remarks || "",
    createdAt: row.createdAt || null,
    actorName:
      displayName(actorEmployee) ||
      displayName(actorUser) ||
      actorUser?.username ||
      "System",
    actorCode: actorEmployee?.employeeCode || "",
  };
}

export function normalizeAssetVerification(row) {
  if (!row || typeof row !== "object") return null;
  const verificationId = pick(row.verificationId, row.id);
  const status = String(row.status || "").toLowerCase() || "pending";
  return {
    ...row,
    verificationId,
    id: verificationId,
    assetId: pick(row.assetId, row.asset?.assetId) || null,
    cycleLabel: row.cycleLabel || "",
    status,
    confirmedAt: row.confirmedAt || null,
    managerApprovedAt: row.managerApprovedAt || null,
    remarks: row.remarks || "",
    createdAt: row.createdAt || null,
    canAction: status === "pending" || status === "awaiting" || status === "open",
    assetTag: row.asset?.assetTag || "",
    assetName: row.asset?.name || "",
    employeeName: displayName(row.employee),
  };
}

export function normalizeAssetIncident(row) {
  if (!row || typeof row !== "object") return null;
  const incidentId = pick(row.incidentId, row.id);
  return {
    ...row,
    incidentId,
    id: incidentId,
    assetId: pick(row.assetId, row.asset?.assetId) || null,
    incidentType: String(row.incidentType || "").toLowerCase() || "",
    reportedAt: row.reportedAt || null,
    description: row.description || "",
    status: String(row.status || "").toLowerCase() || "reported",
    policeReportNumber: row.policeReportNumber || "",
    insuranceClaimed: Boolean(row.insuranceClaimed),
    rejectionReason: row.rejectionReason || "",
    assetTag: row.asset?.assetTag || "",
    assetName: row.asset?.name || "",
    employeeName: displayName(row.employee),
    files: Array.isArray(row.files) ? row.files : [],
  };
}

/**
 * GET /api/employee/portal/my-assets
 */
export async function listMyAssets() {
  try {
    const { data } = await api.get("/api/employee/portal/my-assets");
    const body = unwrap(data, "Failed to load assets");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeAssetAssignment)
      .filter(Boolean);
    return { rows, meta: body.meta || { total: rows.length } };
  } catch (err) {
    throw toApiError(err, "Failed to load assets");
  }
}

/**
 * GET /api/employee/portal/my-assets/{assetId}/history
 */
export async function getAssetHistory(assetId, { page = 1, limit = 20 } = {}) {
  const id = assetId?.assetId || assetId?.id || assetId;
  if (!id) {
    const err = new Error("Missing asset id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.get(
      `/api/employee/portal/my-assets/${id}/history`,
      { params: { page, limit } }
    );
    const body = unwrap(data, "Failed to load asset history");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeAssetHistory)
      .filter(Boolean);
    return {
      rows,
      meta: body.meta || { total: rows.length, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load asset history");
  }
}

/**
 * POST /api/employee/portal/my-assets/assignments/{assignmentId}/acknowledge
 * Note: path uses assignmentId (not assetId).
 */
export async function acknowledgeAssetAssignment(assignmentId) {
  const id =
    assignmentId?.assignmentId || assignmentId?.id || assignmentId;
  if (!id) {
    const err = new Error("Missing assignment id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/my-assets/assignments/${id}/acknowledge`
    );
    return unwrap(data, "Failed to acknowledge asset");
  } catch (err) {
    throw toApiError(err, "Failed to acknowledge asset");
  }
}

/**
 * GET /api/employee/portal/my-assets/verifications
 */
export async function listAssetVerifications({ page = 1, limit = 20 } = {}) {
  try {
    const { data } = await api.get(
      "/api/employee/portal/my-assets/verifications",
      { params: { page, limit } }
    );
    const body = unwrap(data, "Failed to load verifications");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeAssetVerification)
      .filter(Boolean);
    return {
      rows,
      meta: body.meta || { total: rows.length, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load verifications");
  }
}

/**
 * POST /api/employee/portal/my-assets/verifications/{id}/confirm
 */
export async function confirmAssetVerification(verificationId) {
  const id =
    verificationId?.verificationId || verificationId?.id || verificationId;
  if (!id) {
    const err = new Error("Missing verification id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/my-assets/verifications/${id}/confirm`
    );
    return unwrap(data, "Failed to confirm verification");
  } catch (err) {
    throw toApiError(err, "Failed to confirm verification");
  }
}

/**
 * POST /api/employee/portal/my-assets/verifications/{id}/dispute
 * Body: { remarks }
 */
export async function disputeAssetVerification(verificationId, payload = {}) {
  const id =
    verificationId?.verificationId || verificationId?.id || verificationId;
  if (!id) {
    const err = new Error("Missing verification id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/my-assets/verifications/${id}/dispute`,
      { remarks: payload.remarks || "" }
    );
    return unwrap(data, "Failed to dispute verification");
  } catch (err) {
    throw toApiError(err, "Failed to dispute verification");
  }
}

/**
 * GET /api/employee/portal/my-assets/incidents
 */
export async function listAssetIncidents({ page = 1, limit = 20 } = {}) {
  try {
    const { data } = await api.get(
      "/api/employee/portal/my-assets/incidents",
      { params: { page, limit } }
    );
    const body = unwrap(data, "Failed to load incidents");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeAssetIncident)
      .filter(Boolean);
    return {
      rows,
      meta: body.meta || { total: rows.length, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load incidents");
  }
}

/**
 * POST /api/employee/portal/my-assets/incidents
 * Body: { assetId, incidentType, description, policeReportNumber? }
 */
export async function reportAssetIncident(payload = {}) {
  const assetId = payload.assetId?.assetId || payload.assetId;
  if (!assetId) {
    const err = new Error("Asset is required.");
    err.code = "MISSING_ASSET";
    throw err;
  }
  if (!payload.incidentType) {
    const err = new Error("Incident type is required.");
    err.code = "MISSING_TYPE";
    throw err;
  }
  try {
    const body = {
      assetId: String(assetId),
      incidentType: String(payload.incidentType),
      description: String(payload.description || "").trim(),
    };
    if (payload.policeReportNumber) {
      body.policeReportNumber = String(payload.policeReportNumber).trim();
    }
    const { data } = await api.post(
      "/api/employee/portal/my-assets/incidents",
      body
    );
    const res = unwrap(data, "Failed to report incident");
    return {
      ...res,
      data: normalizeAssetIncident(res.data) || res.data,
    };
  } catch (err) {
    throw toApiError(err, "Failed to report incident");
  }
}
