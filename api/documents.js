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

export function normalizeMyDocument(row) {
  if (!row || typeof row !== "object") return null;
  const docId = pick(row.docId, row.id);
  return {
    ...row,
    docId,
    id: docId,
    employeeId: pick(row.employeeId) || null,
    docTypeId: pick(row.docTypeId) || null,
    docTypeName: row.docTypeName || row.docType || "",
    documentNumber: row.documentNumber || "",
    issuedBy: row.issuedBy || "",
    issueDate: toDateKey(row.issueDate) || row.issueDate || null,
    startDate: toDateKey(row.startDate) || row.startDate || null,
    expiryDate: toDateKey(row.expiryDate) || row.expiryDate || null,
    fileUrl: row.fileUrl || null,
    verificationStatus:
      String(row.verificationStatus || "").toLowerCase() || "pending",
    createdAt: row.createdAt || null,
  };
}

export function normalizeDocumentType(row) {
  if (!row || typeof row !== "object") return null;
  const docTypeId = pick(row.docTypeId, row.recno, row.id);
  return {
    ...row,
    docTypeId,
    recno: pick(row.recno, docTypeId),
    text: row.text || row.docType || "",
    docType: row.docType || row.text || "",
    allowIssueBy: Boolean(row.allowIssueBy),
    allowIssueByMandatory: Boolean(row.allowIssueByMandatory),
    allowStartDate: Boolean(row.allowStartDate),
    allowStartDateMandatory: Boolean(row.allowStartDateMandatory),
    allowExpiryDate: Boolean(row.allowExpiryDate),
    allowExpiryDateMandatory: Boolean(row.allowExpiryDateMandatory),
  };
}

/**
 * List own uploaded HR documents.
 * GET /api/employee/portal/documents?page=&limit=
 */
export async function listMyDocuments({ page = 1, limit = 20 } = {}) {
  try {
    const { data } = await api.get("/api/employee/portal/documents", {
      params: { page, limit },
    });
    const body = unwrap(data, "Failed to load documents");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeMyDocument)
      .filter(Boolean);
    return {
      rows,
      meta: body.meta || { total: rows.length, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load documents");
  }
}

/**
 * Active document types for upload form.
 * GET /api/employee/portal/dropdowns/document-types
 */
export async function getDocumentTypes() {
  try {
    const { data } = await api.get(
      "/api/employee/portal/dropdowns/document-types"
    );
    const body = unwrap(data, "Failed to load document types");
    return (Array.isArray(body.data) ? body.data : [])
      .map(normalizeDocumentType)
      .filter(Boolean);
  } catch (err) {
    throw toApiError(err, "Failed to load document types");
  }
}

/**
 * Upload and save a document (multipart/form-data).
 * POST /api/employee/portal/documents
 *
 * @param {{
 *   file?: File|null,
 *   files?: File[],
 *   docTypeId: string,
 *   documentNumber?: string,
 *   issuedBy?: string,
 *   issueDate?: string,
 *   startDate?: string,
 *   expiryDate?: string,
 * }} payload
 */
export async function createDocument(payload = {}) {
  const {
    file,
    files,
    docTypeId,
    documentNumber,
    issuedBy,
    issueDate,
    startDate,
    expiryDate,
  } = payload;

  if (!docTypeId) {
    const err = new Error("Document type is required.");
    err.code = "MISSING_DOC_TYPE";
    throw err;
  }

  const form = new FormData();
  const fileList = (Array.isArray(files) ? files : [file]).filter(Boolean);
  for (const f of fileList) {
    form.append("files[]", f);
  }
  form.append("docTypeId", String(docTypeId));
  if (documentNumber) form.append("documentNumber", String(documentNumber));
  if (issuedBy) form.append("issuedBy", String(issuedBy));
  if (issueDate) form.append("issueDate", String(issueDate));
  if (startDate) form.append("startDate", String(startDate));
  if (expiryDate) form.append("expiryDate", String(expiryDate));

  try {
    const { data } = await api.post("/api/employee/portal/documents", form);
    const body = unwrap(data, "Failed to upload document");
    return {
      ...body,
      data: normalizeMyDocument(body.data) || body.data,
    };
  } catch (err) {
    throw toApiError(err, "Failed to upload document");
  }
}

/**
 * Delete own document.
 * DELETE /api/employee/portal/documents/{docId}
 */
export async function deleteDocument(docId) {
  const id = docId?.docId || docId?.id || docId;
  if (!id) {
    const err = new Error("Missing document id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.delete(
      `/api/employee/portal/documents/${id}`
    );
    return unwrap(data, "Failed to delete document");
  } catch (err) {
    throw toApiError(err, "Failed to delete document");
  }
}
