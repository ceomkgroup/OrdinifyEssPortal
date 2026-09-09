import {
  AlertTriangle,
  Bell,
  Briefcase,
  CheckCircle2,
  Clock3,
  Home,
  Timer,
  UserX,
  XCircle,
} from "lucide-react";

const EVENT_VISUALS = {
  ATTENDANCE_CHANGE_REJECTED: {
    icon: XCircle,
    tone: "danger",
    label: "Rejected",
  },
  ATTENDANCE_CHANGE_APPROVED: {
    icon: CheckCircle2,
    tone: "success",
    label: "Approved",
  },
  CUMULATIVE_PENALTY_FIRED: {
    icon: AlertTriangle,
    tone: "danger",
    label: "Penalty",
  },
  ATTENDANCE_MISSED_PUNCH: {
    icon: Clock3,
    tone: "warning",
    label: "Missed punch",
  },
  ATTENDANCE_LATE_CHECKIN: {
    icon: Clock3,
    tone: "warning",
    label: "Late check-in",
  },
  ATTENDANCE_AUTO_ABSENT: {
    icon: UserX,
    tone: "danger",
    label: "Absent",
  },
  ON_DUTY_SUBMITTED: {
    icon: Briefcase,
    tone: "info",
    label: "On-duty",
  },
  WFH_SUBMITTED: {
    icon: Home,
    tone: "info",
    label: "WFH",
  },
  OT_SUBMITTED: {
    icon: Timer,
    tone: "info",
    label: "Overtime",
  },
};

const TONE_CLASS = {
  danger: {
    icon: "bg-[var(--danger-soft)] text-[var(--danger)]",
    unreadBorder: "border-l-[var(--danger)]",
  },
  warning: {
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    unreadBorder: "border-l-amber-500",
  },
  success: {
    icon: "bg-[var(--success-soft)] text-[var(--success)]",
    unreadBorder: "border-l-[var(--success)]",
  },
  info: {
    icon: "bg-[var(--lavender-soft)] text-[var(--violet)]",
    unreadBorder: "border-l-[var(--violet)]",
  },
  default: {
    icon: "bg-[var(--panel-soft)] text-[var(--muted)]",
    unreadBorder: "border-l-[var(--violet)]",
  },
};

function sameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getNotificationVisual(eventType) {
  const key = String(eventType || "").toUpperCase();
  const match = EVENT_VISUALS[key];
  const tone = match?.tone || "default";
  return {
    Icon: match?.icon || Bell,
    tone,
    label: match?.label || "Update",
    toneClass: TONE_CLASS[tone] || TONE_CLASS.default,
  };
}

export function formatRelativeTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "Just now";

  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24 && sameCalendarDay(date, now)) return `${diffHr} hr ago`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameCalendarDay(date, yesterday)) return "Yesterday";

  if (diffDay < 7) return `${diffDay} days ago`;
  return "";
}

export function groupNotificationsByDay(rows) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const groups = [
    { key: "today", label: "Today", items: [] },
    { key: "yesterday", label: "Yesterday", items: [] },
    { key: "earlier", label: "Earlier", items: [] },
  ];

  for (const row of rows) {
    const date = row.createdAt ? new Date(row.createdAt) : null;
    if (!date || Number.isNaN(date.getTime())) {
      groups[2].items.push(row);
      continue;
    }
    if (sameCalendarDay(date, today)) groups[0].items.push(row);
    else if (sameCalendarDay(date, yesterday)) groups[1].items.push(row);
    else groups[2].items.push(row);
  }

  return groups.filter((group) => group.items.length > 0);
}
