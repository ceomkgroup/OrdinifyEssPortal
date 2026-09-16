import {
  Banknote,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarClock,
  ClipboardCheck,
  ClipboardPen,
  Clock3,
  Coins,
  Gauge,
  Home,
  Inbox,
  MoonStar,
  Palmtree,
  Receipt,
  RefreshCw,
  Users,
} from "lucide-react";

/**
 * Team (MSS) sidebar children.
 * Visible only when company-modules includes `employees` AND
 * GET /team/capabilities.isManager is true.
 */
export const TEAM_NAV = [
  {
    key: "members",
    href: "/team",
    title: "Members",
    description: "People who report to you.",
    icon: Users,
    screens: ["employees"],
  },
  {
    key: "approvals",
    href: "/team/requests",
    title: "Approvals",
    description: "Pending requests from your direct reports.",
    icon: Inbox,
    screens: ["employees"],
  },
  {
    key: "attendance",
    href: "/team/attendance",
    title: "Attendance log",
    description: "Daily punches for people who report to you.",
    icon: CalendarCheck2,
    screens: ["employees"],
  },
  {
    key: "corrections",
    href: "/team/corrections",
    title: "Corrections",
    description: "Attendance corrections you submitted for your team.",
    icon: ClipboardPen,
    screens: ["employees"],
  },
  {
    key: "kpi",
    href: "/team/kpi",
    title: "Team KPI",
    description: "KPI scores for people who report to you.",
    icon: Gauge,
    screens: ["employees"],
  },
];

export function getTeamNavByHref(href) {
  return TEAM_NAV.find((item) => item.href === href) || null;
}

export function getTeamNavByKey(key) {
  return TEAM_NAV.find((item) => item.key === key) || null;
}

/**
 * Manager approval inboxes. `capabilityKey` maps to
 * GET /api/employee/portal/team/capabilities data.<key>.
 * Only types with view:true are listed; apply:true can decide.
 */
export const TEAM_APPROVAL_TYPES = [
  {
    key: "leave",
    capabilityKey: "leave",
    title: "Leave",
    icon: Palmtree,
    listPath: "/api/employee/portal/team/leave",
    decisionPath: (id) => `/api/employee/portal/team/leave/${id}/decision`,
    idFields: ["requestId", "id"],
    decisionKind: "leave",
  },
  {
    key: "wfh",
    capabilityKey: "wfh",
    title: "WFH",
    icon: Home,
    listPath: "/api/employee/portal/team/wfh",
    decisionPath: (id) => `/api/employee/portal/team/wfh/${id}/decision`,
    idFields: ["wfhId", "requestId", "id"],
    decisionKind: "comments",
  },
  {
    key: "attendanceChange",
    capabilityKey: "attendanceChangeApproval",
    title: "Attendance change",
    icon: CalendarClock,
    listPath: "/api/employee/portal/team/attendance-change",
    decisionPath: (id) =>
      `/api/employee/portal/team/attendance-change/${id}/decision`,
    idFields: ["requestId", "id"],
    decisionKind: "comments",
  },
  {
    key: "attendanceLog",
    capabilityKey: "attendanceLogApproval",
    title: "Attendance log",
    icon: ClipboardCheck,
    listPath: "/api/employee/portal/team/attendance-log",
    decisionPath: (id) =>
      `/api/employee/portal/team/attendance-log/${id}/decision`,
    idFields: [
      "logId",
      "attendanceLogId",
      "attendanceId",
      "recno",
      "requestId",
      "id",
    ],
    pendingFromApi: true,
    decisionKind: "comments",
  },
  {
    key: "shiftChange",
    capabilityKey: "shiftChange",
    title: "Shift change",
    icon: RefreshCw,
    listPath: "/api/employee/portal/team/shift-change",
    decisionPath: (id) =>
      `/api/employee/portal/team/shift-change/${id}/decision`,
    idFields: ["requestId", "id"],
    decisionKind: "comments",
  },
  {
    key: "onDuty",
    capabilityKey: "onDuty",
    title: "On duty",
    icon: BriefcaseBusiness,
    listPath: "/api/employee/portal/team/on-duty",
    decisionPath: (id) => `/api/employee/portal/team/on-duty/${id}/decision`,
    idFields: ["onDutyId", "requestId", "id"],
    decisionKind: "comments",
  },
  {
    key: "overtime",
    capabilityKey: "overtime",
    title: "Overtime",
    icon: Clock3,
    listPath: "/api/employee/portal/team/overtime",
    decisionPath: (id) => `/api/employee/portal/team/overtime/${id}/decision`,
    idFields: ["otRequestId", "requestId", "id"],
    decisionKind: "overtime",
  },
  {
    key: "compOff",
    capabilityKey: "compOff",
    title: "Comp off",
    icon: MoonStar,
    listPath: "/api/employee/portal/team/comp-off",
    decisionPath: (id) => `/api/employee/portal/team/comp-off/${id}/decision`,
    idFields: ["compOffId", "requestId", "id"],
    decisionKind: "comments",
  },
  {
    key: "loan",
    capabilityKey: "loan",
    title: "Loan",
    icon: Banknote,
    listPath: "/api/employee/portal/team/loan",
    decisionPath: (id) => `/api/employee/portal/team/loan/${id}/decision`,
    idFields: ["loanId", "requestId", "id"],
    decisionKind: "loan",
  },
  {
    key: "advance",
    capabilityKey: "advance",
    title: "Advance",
    icon: Coins,
    listPath: "/api/employee/portal/team/advance",
    decisionPath: (id) => `/api/employee/portal/team/advance/${id}/decision`,
    idFields: ["advanceId", "requestId", "id"],
    decisionKind: "comments",
  },
  {
    key: "expenseClaim",
    capabilityKey: "expenseClaim",
    title: "Expense claim",
    icon: Receipt,
    listPath: "/api/employee/portal/team/expense-claim",
    decisionPath: (id) =>
      `/api/employee/portal/team/expense-claim/${id}/decision`,
    idFields: ["expenseClaimId", "requestId", "id"],
    pendingFromApi: true,
    decisionKind: "expense",
  },
];

export function getTeamApprovalType(key) {
  return TEAM_APPROVAL_TYPES.find((item) => item.key === key) || null;
}

export function getTeamApprovalTypeByCapability(capabilityKey) {
  return (
    TEAM_APPROVAL_TYPES.find((item) => item.capabilityKey === capabilityKey) ||
    null
  );
}
