import { Banknote, ClipboardList, Wallet } from "lucide-react";

/**
 * Leave section children (sidebar submenu), like REQUEST_TYPES / DOCUMENT_TYPES.
 * screens: company-modules screenControllers required for each child.
 */
export const LEAVE_NAV = [
  {
    key: "leaveLogs",
    href: "/leave/logs",
    title: "Leave Logs",
    description: "Apply for leave and track your leave requests.",
    icon: ClipboardList,
    screens: ["leave"],
  },
  {
    key: "leaveEncashment",
    href: "/leave/encashment",
    title: "Leave Encashment",
    description: "Request leave encashment and track status.",
    icon: Banknote,
    screens: ["leave"],
    flag: "allowLeaveEncashment",
  },
  {
    key: "leaveBalance",
    href: "/leave/balance",
    title: "Leave Balance",
    description: "View remaining, used, and allocated leave by type.",
    icon: Wallet,
    screens: ["leave"],
  },
];

export function getLeaveNavByHref(href) {
  return LEAVE_NAV.find((item) => item.href === href) || null;
}

export function getLeaveNavByKey(key) {
  return LEAVE_NAV.find((item) => item.key === key) || null;
}
