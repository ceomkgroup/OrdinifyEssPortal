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

export function normalizeOrgCategory(row) {
  if (!row || typeof row !== "object") return null;
  const categoryId = pick(row.categoryId, row.id);
  return {
    ...row,
    categoryId,
    id: categoryId,
    parentCategoryId: row.parentCategoryId || null,
    name: row.name || "",
    slug: row.slug || "",
    description: row.description || "",
    systemType: row.systemType || "",
    sortOrder: row.sortOrder ?? 0,
    status: String(row.status || "").toLowerCase() || "active",
    createdAt: row.createdAt || null,
  };
}

function normalizeVersion(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    versionId: pick(raw.versionId, raw.id),
    fileName: raw.fileName || "",
    fileUrl: raw.fileUrl || null,
    mimeType: raw.mimeType || "",
    sizeBytes: raw.sizeBytes != null ? Number(raw.sizeBytes) : null,
    versionNumber: raw.versionNumber ?? null,
    changeNote: raw.changeNote || "",
    createdAt: raw.createdAt || null,
  };
}

export function normalizeOrgDocument(row) {
  if (!row || typeof row !== "object") return null;
  const documentId = pick(row.documentId, row.id);
  const category = row.category && typeof row.category === "object"
    ? {
        categoryId: pick(row.category.categoryId, row.categoryId),
        name: row.category.name || "",
      }
    : row.categoryId
      ? { categoryId: row.categoryId, name: "" }
      : null;

  return {
    ...row,
    documentId,
    id: documentId,
    categoryId: pick(row.categoryId, category?.categoryId),
    title: row.title || "",
    description: row.description || "",
    visibility: row.visibility || "",
    status: String(row.status || "").toLowerCase() || "",
    statusLabel: row.statusLabel || null,
    currentVersionId: row.currentVersionId || null,
    requiresAcknowledgement: Boolean(row.requiresAcknowledgement),
    allowDownload: row.allowDownload !== false,
    expiryDate: toDateKey(row.expiryDate) || row.expiryDate || null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    approvedAt: row.approvedAt || null,
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
    category,
    currentVersion: normalizeVersion(row.currentVersion),
    acknowledged: Boolean(
      row.acknowledged ||
        row.hasAcknowledged ||
        row.acknowledgementStatus === "accepted" ||
        row.ackStatus === "accepted"
    ),
  };
}

/**
 * Document categories (folder tree).
 * GET /api/employee/portal/org-documents/categories
 */
export async function listOrgDocumentCategories() {
  try {
    const { data } = await api.get(
      "/api/employee/portal/org-documents/categories"
    );
    const body = unwrap(data, "Failed to load document categories");
    return (Array.isArray(body.data) ? body.data : [])
      .map(normalizeOrgCategory)
      .filter(Boolean)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  } catch (err) {
    throw toApiError(err, "Failed to load document categories");
  }
}

/**
 * Browse published org documents visible to me.
 * GET /api/employee/portal/org-documents?page=&limit=&categoryId=&search=&tag=
 */
export async function listOrgDocuments({
  page = 1,
  limit = 20,
  categoryId,
  search,
  tag,
} = {}) {
  try {
    const params = { page, limit };
    if (categoryId) params.categoryId = categoryId;
    if (search) params.search = search;
    if (tag) params.tag = tag;

    const { data } = await api.get("/api/employee/portal/org-documents", {
      params,
    });
    const body = unwrap(data, "Failed to load company documents");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeOrgDocument)
      .filter(Boolean);
    return {
      rows,
      meta: body.meta || { total: rows.length, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load company documents");
  }
}

/**
 * Get org document detail.
 * GET /api/employee/portal/org-documents/{id}
 */
export async function getOrgDocument(documentId) {
  const id = documentId?.documentId || documentId?.id || documentId;
  if (!id) {
    const err = new Error("Missing document id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.get(
      `/api/employee/portal/org-documents/${id}`
    );
    const body = unwrap(data, "Failed to load document");
    return normalizeOrgDocument(body.data) || body.data;
  } catch (err) {
    throw toApiError(err, "Failed to load document");
  }
}

/**
 * Get download URL (records audit).
 * GET /api/employee/portal/org-documents/{id}/download
 */
export async function downloadOrgDocument(documentId) {
  const id = documentId?.documentId || documentId?.id || documentId;
  if (!id) {
    const err = new Error("Missing document id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.get(
      `/api/employee/portal/org-documents/${id}/download`
    );
    const body = unwrap(data, "Failed to get download link");
    return {
      url: body.data?.url || null,
      fileName: body.data?.fileName || "document",
    };
  } catch (err) {
    throw toApiError(err, "Failed to get download link");
  }
}

/**
 * Mark document as read/accepted.
 * POST /api/employee/portal/org-documents/{id}/acknowledge
 * Body: { accepted: true }
 */
export async function acknowledgeOrgDocument(
  documentId,
  { accepted = true } = {}
) {
  const id = documentId?.documentId || documentId?.id || documentId;
  if (!id) {
    const err = new Error("Missing document id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/org-documents/${id}/acknowledge`,
      { accepted: Boolean(accepted) }
    );
    return unwrap(data, "Failed to acknowledge document");
  } catch (err) {
    throw toApiError(err, "Failed to acknowledge document");
  }
}
