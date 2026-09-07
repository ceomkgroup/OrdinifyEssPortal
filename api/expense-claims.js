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

function toNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeExpenseItem(row) {
  if (!row || typeof row !== "object") return null;
  const itemId = pick(row.itemId, row.id);
  const receiptUrl = pick(row.receiptUrl, row.fileUrl, row.url) || null;
  return {
    ...row,
    itemId,
    id: itemId,
    categoryId: pick(row.categoryId, row.category?.categoryId) || null,
    categoryName:
      row.category?.name || row.categoryName || row.categoryLabel || "",
    description: row.description || "",
    amount: toNumber(row.amount),
    expenseDate: toDateKey(row.expenseDate) || row.expenseDate || null,
    receiptUrl,
    fileUrl: receiptUrl,
    fileName: pick(row.fileName, row.receiptName, row.originalName) || null,
  };
}

export function normalizeExpenseClaim(row) {
  if (!row || typeof row !== "object") return null;
  const expenseClaimId = pick(row.expenseClaimId, row.id);
  const items = (Array.isArray(row.items) ? row.items : [])
    .map(normalizeExpenseItem)
    .filter(Boolean);
  const status = String(row.status || "").toLowerCase() || "draft";

  return {
    ...row,
    expenseClaimId,
    id: expenseClaimId,
    claimNumber: row.claimNumber || "",
    status,
    statusLabel: row.statusLabel || null,
    currentLevel: row.currentLevel ?? null,
    totalLevels: row.totalLevels ?? null,
    levelName: row.levelName || null,
    reimbursementMode: row.reimbursementMode || null,
    reimbursementStatus:
      String(row.reimbursementStatus || "").toLowerCase() || "",
    reimbursementStatusLabel: row.reimbursementStatusLabel || null,
    isTaxable: Boolean(row.isTaxable),
    totalAmount: toNumber(row.totalAmount),
    approvedAmount: toNumber(row.approvedAmount),
    totalPaid: toNumber(row.totalPaid) ?? 0,
    remainingAmount: toNumber(row.remainingAmount),
    reason: row.reason || "",
    remarks: row.remarks || row.note || "",
    rejectionReason: row.rejectionReason || row.rejectReason || "",
    submittedAt: row.submittedAt || null,
    approvedAt: row.approvedAt || null,
    paidAt: row.paidAt || null,
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
    items,
    itemCount: items.length,
    canSubmit: status === "draft",
    canCancel: status === "draft" || status === "pending",
  };
}

export function normalizeExpenseCategory(row) {
  if (!row || typeof row !== "object") return null;
  const categoryId = pick(row.categoryId, row.id, row.recno);
  return {
    ...row,
    categoryId,
    id: categoryId,
    name: row.name || row.text || row.label || "",
  };
}

/**
 * GET /api/employee/portal/expense-claims?status=&page=&limit=
 * UI "cancelled" maps to API "rejected" (backend rejects status=cancelled).
 */
export async function listExpenseClaims({
  status,
  page = 1,
  limit = 10,
} = {}) {
  try {
    const params = { page, limit };
    let apiStatus = status && status !== "all" ? String(status).toLowerCase() : "";
    if (apiStatus === "cancelled" || apiStatus === "canceled") {
      apiStatus = "rejected";
    }
    if (apiStatus) params.status = apiStatus;

    const { data } = await api.get("/api/employee/portal/expense-claims", {
      params,
    });
    const body = unwrap(data, "Failed to load expense claims");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeExpenseClaim)
      .filter(Boolean);

    return {
      rows,
      meta: body.meta || { total: rows.length, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load expense claims");
  }
}

/**
 * POST /api/employee/portal/expense-claims
 * Body: { reason?, items: [{ categoryId, description?, amount, expenseDate, receiptUrl? }] }
 * If any item has a File as `receipt`, sends multipart/form-data.
 */
export async function createExpenseClaim(payload = {}) {
  const reason = payload.reason != null ? String(payload.reason).trim() : "";
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  if (!rawItems.length) {
    const err = new Error("Add at least one expense item.");
    err.code = "MISSING_ITEMS";
    throw err;
  }

  const hasFile = rawItems.some((item) => item?.receipt instanceof File);

  try {
    if (hasFile) {
      const form = new FormData();
      if (reason) form.append("reason", reason);
      rawItems.forEach((item, index) => {
        form.append(`items[${index}][categoryId]`, String(item.categoryId));
        form.append(`items[${index}][amount]`, String(item.amount));
        form.append(
          `items[${index}][expenseDate]`,
          String(item.expenseDate || "")
        );
        if (item.description) {
          form.append(
            `items[${index}][description]`,
            String(item.description)
          );
        }
        if (item.receipt instanceof File) {
          form.append(`items[${index}][receipt]`, item.receipt);
        } else if (item.receiptUrl) {
          form.append(
            `items[${index}][receiptUrl]`,
            String(item.receiptUrl)
          );
        }
      });
      const { data } = await api.post(
        "/api/employee/portal/expense-claims",
        form
      );
      const body = unwrap(data, "Failed to create expense claim");
      return {
        ...body,
        data: normalizeExpenseClaim(body.data) || body.data,
      };
    }

    const items = rawItems.map((item) => {
      const next = {
        categoryId: String(item.categoryId),
        amount: Number(item.amount),
        expenseDate: String(item.expenseDate),
      };
      if (item.description) next.description = String(item.description).trim();
      if (item.receiptUrl) next.receiptUrl = String(item.receiptUrl).trim();
      return next;
    });

    const { data } = await api.post("/api/employee/portal/expense-claims", {
      reason: reason || undefined,
      items,
    });
    const body = unwrap(data, "Failed to create expense claim");
    return {
      ...body,
      data: normalizeExpenseClaim(body.data) || body.data,
    };
  } catch (err) {
    throw toApiError(err, "Failed to create expense claim");
  }
}

/**
 * POST /api/employee/portal/expense-claims/{expenseClaimId}/submit
 */
export async function submitExpenseClaim(expenseClaimId) {
  const id =
    expenseClaimId?.expenseClaimId ||
    expenseClaimId?.id ||
    expenseClaimId;
  if (!id) {
    const err = new Error("Missing expense claim id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/expense-claims/${id}/submit`
    );
    return unwrap(data, "Failed to submit expense claim");
  } catch (err) {
    throw toApiError(err, "Failed to submit expense claim");
  }
}

/**
 * POST /api/employee/portal/expense-claims/{expenseClaimId}/cancel
 */
export async function cancelExpenseClaim(expenseClaimId) {
  const id =
    expenseClaimId?.expenseClaimId ||
    expenseClaimId?.id ||
    expenseClaimId;
  if (!id) {
    const err = new Error("Missing expense claim id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/expense-claims/${id}/cancel`
    );
    return unwrap(data, "Failed to cancel expense claim");
  } catch (err) {
    throw toApiError(err, "Failed to cancel expense claim");
  }
}

/**
 * Active expense categories for the create form.
 * Tries dropdown endpoint, then expense-categories list.
 */
export async function getExpenseCategories() {
  const endpoints = [
    "/api/employee/portal/dropdowns/expense-categories",
    "/api/employee/portal/expense-categories",
  ];

  let lastError = null;
  for (const url of endpoints) {
    try {
      const { data } = await api.get(url);
      const body = unwrap(data, "Failed to load expense categories");
      const rows = (Array.isArray(body.data) ? body.data : [])
        .map(normalizeExpenseCategory)
        .filter(Boolean);
      if (rows.length) return rows;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) throw toApiError(lastError, "Failed to load expense categories");
  return [];
}
