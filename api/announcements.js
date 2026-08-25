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

export function normalizeAnnouncementRow(row) {
  if (!row || typeof row !== "object") return null;
  const announcementId = pick(row.announcementId, row.id);
  return {
    ...row,
    announcementId,
    id: announcementId,
    title: row.title || "Announcement",
    description: row.description || "",
    category: String(row.category || "").toLowerCase() || "general",
    priority: String(row.priority || "normal").toLowerCase(),
    bannerImageUrl: row.bannerImageUrl || null,
    isPinned: Boolean(row.isPinned),
    requireAck: Boolean(row.requireAck),
    commentsEnabled: Boolean(row.commentsEnabled),
    reactionsEnabled: Boolean(row.reactionsEnabled),
    publishedAt: row.publishedAt || null,
    expiresAt: row.expiresAt || null,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    isRead: Boolean(row.isRead),
    isAcknowledged: Boolean(row.isAcknowledged),
    myReaction: row.myReaction || null,
    totalReactions: Number(row.totalReactions) || 0,
    totalComments: Number(row.totalComments) || 0,
  };
}

export function normalizeCommentRow(row) {
  if (!row || typeof row !== "object") return null;
  return {
    commentId: pick(row.commentId, row.id),
    announcementId: row.announcementId || null,
    employeeId: row.employeeId || null,
    employeeName: row.employeeName || "Employee",
    photoUrl: row.photoUrl || null,
    comment: row.comment || "",
    createdAt: row.createdAt || null,
  };
}

/**
 * List published announcements.
 * GET /api/employee/portal/announcements?page=&limit=&category=
 * Short TTL cache avoids shell badge + page double-hit.
 */
let announcementsListCache = null;
let announcementsListKey = "";
let announcementsListAt = 0;
const ANNOUNCEMENTS_LIST_TTL_MS = 45_000;

export function clearAnnouncementsListCache() {
  announcementsListCache = null;
  announcementsListKey = "";
  announcementsListAt = 0;
}

export async function listAnnouncements({
  page = 1,
  limit = 20,
  category,
  force = false,
} = {}) {
  const key = `${page}:${limit}:${category || "all"}`;
  const now = Date.now();
  if (
    !force &&
    announcementsListCache &&
    announcementsListKey === key &&
    now - announcementsListAt < ANNOUNCEMENTS_LIST_TTL_MS
  ) {
    return announcementsListCache;
  }

  try {
    const params = { page, limit };
    if (category && category !== "all") params.category = category;

    const { data } = await api.get("/api/employee/portal/announcements", {
      params,
    });
    const body = unwrap(data, "Failed to load announcements");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeAnnouncementRow)
      .filter(Boolean);

    // Pinned first, then unread, then newest
    rows.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return (
        new Date(b.publishedAt || 0).getTime() -
        new Date(a.publishedAt || 0).getTime()
      );
    });

    const result = {
      rows,
      meta: body.meta || { total: rows.length, page, limit, totalPages: 1 },
    };
    announcementsListCache = result;
    announcementsListKey = key;
    announcementsListAt = Date.now();
    return result;
  } catch (err) {
    throw toApiError(err, "Failed to load announcements");
  }
}

/**
 * Mark all delivered announcements as read.
 * PATCH /api/employee/portal/announcements/read-all
 */
export async function markAllAnnouncementsRead() {
  try {
    const { data } = await api.patch(
      "/api/employee/portal/announcements/read-all"
    );
    clearAnnouncementsListCache();
    return unwrap(data, "Failed to mark announcements as read");
  } catch (err) {
    throw toApiError(err, "Failed to mark announcements as read");
  }
}

/**
 * View a single announcement (marks as read).
 * GET /api/employee/portal/announcements/{id}
 */
export async function getAnnouncement(id) {
  if (!id) {
    const err = new Error("Missing announcement id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.get(
      `/api/employee/portal/announcements/${id}`
    );
    const body = unwrap(data, "Failed to load announcement");
    // Opening detail marks as read — drop list cache so unread badges refresh.
    clearAnnouncementsListCache();
    return normalizeAnnouncementRow(body.data);
  } catch (err) {
    throw toApiError(err, "Failed to load announcement");
  }
}

/**
 * Acknowledge announcement when requireAck=true.
 * POST /api/employee/portal/announcements/{id}/acknowledge
 */
export async function acknowledgeAnnouncement(id) {
  if (!id) {
    const err = new Error("Missing announcement id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/announcements/${id}/acknowledge`
    );
    return unwrap(data, "Failed to acknowledge announcement");
  } catch (err) {
    throw toApiError(err, "Failed to acknowledge announcement");
  }
}

/**
 * List comments.
 * GET /api/employee/portal/announcements/{id}/comments?page=&limit=
 */
export async function listAnnouncementComments(
  id,
  { page = 1, limit = 20 } = {}
) {
  if (!id) {
    const err = new Error("Missing announcement id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.get(
      `/api/employee/portal/announcements/${id}/comments`,
      { params: { page, limit } }
    );
    const body = unwrap(data, "Failed to load comments");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeCommentRow)
      .filter(Boolean);
    return {
      rows,
      meta: body.meta || { total: rows.length, page, limit, totalPages: 1 },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load comments");
  }
}

/**
 * Add a comment when commentsEnabled=true.
 * POST /api/employee/portal/announcements/{id}/comments
 * Body: { comment }
 */
export async function addAnnouncementComment(id, comment) {
  if (!id) {
    const err = new Error("Missing announcement id.");
    err.code = "MISSING_ID";
    throw err;
  }
  const text = String(comment || "").trim();
  if (!text) {
    const err = new Error("Comment is required.");
    err.code = "MISSING_COMMENT";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/announcements/${id}/comments`,
      { comment: text }
    );
    const body = unwrap(data, "Failed to add comment");
    return normalizeCommentRow(body.data) || body.data;
  } catch (err) {
    throw toApiError(err, "Failed to add comment");
  }
}

/**
 * Add/update/toggle reaction when reactionsEnabled=true.
 * POST /api/employee/portal/announcements/{id}/react
 * Body: { reaction }
 */
export async function reactToAnnouncement(id, reaction) {
  if (!id) {
    const err = new Error("Missing announcement id.");
    err.code = "MISSING_ID";
    throw err;
  }
  if (!reaction) {
    const err = new Error("Reaction is required.");
    err.code = "MISSING_REACTION";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/announcements/${id}/react`,
      { reaction }
    );
    const body = unwrap(data, "Failed to update reaction");
    return {
      success: true,
      myReaction: body.data?.myReaction ?? null,
      message: body.message || "",
      raw: body.data,
    };
  } catch (err) {
    throw toApiError(err, "Failed to update reaction");
  }
}

/**
 * Remove reaction.
 * DELETE /api/employee/portal/announcements/{id}/react
 */
export async function removeAnnouncementReaction(id) {
  if (!id) {
    const err = new Error("Missing announcement id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.delete(
      `/api/employee/portal/announcements/${id}/react`
    );
    return unwrap(data, "Failed to remove reaction");
  } catch (err) {
    throw toApiError(err, "Failed to remove reaction");
  }
}
