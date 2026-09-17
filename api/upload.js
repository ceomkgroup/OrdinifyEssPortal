import api from "@/lib/axios";
import { toStorageKey } from "@/lib/media";

/**
 * Known FormType values for POST /api/employee/portal/upload
 */
export const UPLOAD_FORM_TYPES = {
  EMPLOYEE_PHOTO: "employee_photo",
  EMPLOYEE_DOCUMENT: "employee_document",
  ID_CARD: "id_card",
  PASSPORT: "passport",
  MEDICAL_REPORT: "medical_report",
};

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

function normalizeUploadItem(item) {
  if (!item || typeof item !== "object") return null;
  const key = toStorageKey(item.key) || toStorageKey(item.url) || null;
  return {
    key,
    url: item.url || null,
    originalName: item.originalName || item.name || null,
    mimeType: item.mimeType || item.type || null,
    sizeBytes: item.sizeBytes ?? item.size ?? null,
  };
}

/**
 * Generic portal file upload.
 * POST /api/employee/portal/upload (multipart/form-data)
 *
 * Body fields:
 * - files[] (required) — one or more files
 * - FormType (required) — e.g. employee_photo, employee_document, id_card, …
 * - Recno (optional) — employee id; defaults to self on server
 *
 * Returns { key, url, originalName, mimeType, sizeBytes }
 * Persist `key` only (never the public R2 URL) as photoUrl / attachmentUrl.
 */
export async function uploadPortalFiles({
  files,
  formType,
  recno,
} = {}) {
  const list = (Array.isArray(files) ? files : [files]).filter(Boolean);
  if (!list.length) {
    const err = new Error("Please choose a file to upload.");
    err.code = "MISSING_FILE";
    throw err;
  }
  if (!formType) {
    const err = new Error("Upload form type is required.");
    err.code = "MISSING_FORM_TYPE";
    throw err;
  }

  const form = new FormData();
  for (const file of list) {
    form.append("files[]", file);
  }
  form.append("FormType", String(formType));
  if (recno != null && recno !== "") {
    form.append("Recno", String(recno));
  }

  try {
    const { data } = await api.post("/api/employee/portal/upload", form);
    const body = unwrap(data, "Failed to upload file");
    const raw = body.data;

    if (Array.isArray(raw)) {
      const items = raw.map(normalizeUploadItem).filter(Boolean);
      return {
        success: true,
        message: body.message || "",
        items,
        // Convenience: first file (most common single-upload case)
        ...items[0],
      };
    }

    const item = normalizeUploadItem(raw) || {};
    return {
      success: true,
      message: body.message || "",
      items: item.key ? [item] : [],
      ...item,
    };
  } catch (err) {
    throw toApiError(err, "Failed to upload file");
  }
}

/** Upload a single employee profile photo; returns { key, url, … }. */
export async function uploadEmployeePhoto(file, recno) {
  return uploadPortalFiles({
    files: [file],
    formType: UPLOAD_FORM_TYPES.EMPLOYEE_PHOTO,
    recno,
  });
}
