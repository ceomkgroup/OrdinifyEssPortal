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

export function normalizeNotification(row) {
  if (!row || typeof row !== "object") return null;
  const notificationId = pick(row.notificationId, row.id);
  const dataJson =
    row.dataJson && typeof row.dataJson === "object" ? row.dataJson : {};

  return {
    ...row,
    notificationId,
    id: notificationId,
    eventType: row.eventType || "",
    title: row.title || "Notification",
    body: row.body || "",
    dataJson,
    type: String(dataJson.type || "").toLowerCase(),
    isRead: Boolean(row.isRead),
    readAt: row.readAt || null,
    createdAt: row.createdAt || null,
  };
}

const unreadBadgeKey = "1|1|false";
let unreadBadgePromise = null;

/**
 * GET /api/employee/portal/notifications?page=&limit=&unreadOnly=
 */
export async function listNotifications({
  page = 1,
  limit = 20,
  unreadOnly = false,
} = {}) {
  const key = `${page}|${limit}|${Boolean(unreadOnly)}`;
  const isBadgeProbe = key === unreadBadgeKey;

  if (isBadgeProbe && unreadBadgePromise) {
    return unreadBadgePromise;
  }

  const run = (async () => {
    try {
      const { data } = await api.get("/api/employee/portal/notifications", {
        params: { page, limit, unreadOnly },
      });
      const body = unwrap(data, "Failed to load notifications");
      const rows = (Array.isArray(body.data) ? body.data : [])
        .map(normalizeNotification)
        .filter(Boolean);

      return {
        rows,
        meta: {
          page: Number(body.meta?.page) || page,
          limit: Number(body.meta?.limit) || limit,
          total: Number(body.meta?.total) || rows.length,
          totalPages: Number(body.meta?.totalPages) || 1,
          unreadCount: Number(body.meta?.unreadCount) || 0,
        },
      };
    } catch (err) {
      throw toApiError(err, "Failed to load notifications");
    } finally {
      if (isBadgeProbe) unreadBadgePromise = null;
    }
  })();

  if (isBadgeProbe) unreadBadgePromise = run;
  return run;
}

/**
 * PATCH /api/employee/portal/notifications/read-all
 */
export async function markAllNotificationsRead() {
  try {
    const { data } = await api.patch(
      "/api/employee/portal/notifications/read-all"
    );
    return unwrap(data, "Failed to mark notifications as read");
  } catch (err) {
    throw toApiError(err, "Failed to mark notifications as read");
  }
}

/**
 * PATCH /api/employee/portal/notifications/{id}/read
 */
export async function markNotificationRead(notificationId) {
  const id =
    notificationId?.notificationId || notificationId?.id || notificationId;
  if (!id) {
    const err = new Error("Missing notification id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.patch(
      `/api/employee/portal/notifications/${id}/read`
    );
    return unwrap(data, "Failed to mark notification as read");
  } catch (err) {
    throw toApiError(err, "Failed to mark notification as read");
  }
}

/** Deep-link target from dataJson.type */
const TEAM_INBOX_TABS = {
  leave: "leave",
  team_leave: "leave",
  wfh: "wfh",
  team_wfh: "wfh",
  on_duty: "onDuty",
  team_on_duty: "onDuty",
  overtime: "overtime",
  team_overtime: "overtime",
  shift_change: "shiftChange",
  team_shift_change: "shiftChange",
  comp_off: "compOff",
  team_comp_off: "compOff",
  loan: "loan",
  team_loan: "loan",
  advance: "advance",
  team_advance: "advance",
  attendance_change: "attendanceChange",
  team_attendance_change: "attendanceChange",
  attendance_log: "attendanceLog",
  team_attendance_log: "attendanceLog",
  expense_claim: "expenseClaim",
  team_expense_claim: "expenseClaim",
  expense: "expenseClaim",
};

function teamInboxHref(type, data) {
  const isTeam =
    type.startsWith("team_") ||
    String(data.relationship || "").toLowerCase() === "manager" ||
    String(data.inbox || data.scope || "").toLowerCase() === "team";
  if (!isTeam) return null;
  const tab = TEAM_INBOX_TABS[type];
  if (!tab) return "/team/requests";
  const id =
    data.requestId ||
    data.wfhId ||
    data.otRequestId ||
    data.onDutyId ||
    data.advanceId ||
    data.loanId ||
    data.compOffId ||
    data.expenseClaimId ||
    data.logId ||
    data.id ||
    "";
  const qs = new URLSearchParams({ type: tab });
  if (id) qs.set("id", String(id));
  return `/team/requests?${qs.toString()}`;
}

export function getNotificationHref(row) {
  const type = String(row?.type || row?.dataJson?.type || "").toLowerCase();
  const data = row?.dataJson || {};
  const teamHref = teamInboxHref(type, data);
  if (teamHref) return teamHref;

  switch (type) {
    case "attendance_change":
      return "/requests/attendance-change";
    case "wfh":
      return "/requests/wfh";
    case "on_duty":
      return "/requests/on-duty";
    case "overtime":
      return "/requests/overtime";
    case "leave":
      return "/leave/logs";
    case "shift_change":
      return "/requests/shift-change";
    case "comp_off":
      return "/requests/comp-off";
    case "loan":
      return "/requests/loans";
    case "advance":
      return "/requests/advances";
    case "expense":
    case "expense_claim":
      return "/requests/expense-claims";
    case "penalty":
    case "attendance":
      return "/attendance";
    case "announcement":
      return data.announcementId
        ? `/announcements?id=${data.announcementId}`
        : "/announcements";
    case "payslip":
    case "payroll":
      return data.payslipId ? `/payslip/${data.payslipId}` : "/payslip";
    case "tax_certificate":
    case "tax-certificate":
      return "/payslip/tax-certificate";
    default:
      return null;
  }
}
