import {
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  Clock3,
  Coins,
  FileStack,
  Home,
  MoonStar,
  Palmtree,
  RefreshCw,
} from "lucide-react";

/**
 * All ESS request types shown under Requests (hub + sidebar submenu).
 * `live: true` → real page wired; otherwise Coming Soon shell.
 */
export const REQUEST_TYPES = [
  {
    key: "leave",
    href: "/requests/leave",
    title: "Leave Request",
    description: "Apply for leave, track balances, and manage pending requests.",
    icon: Palmtree,
    screens: ["leave"],
    live: true,
  },
  {
    key: "encashment",
    href: "/requests/encashment",
    title: "Leave Encashment",
    description: "Convert unused leave days to salary when enabled.",
    icon: FileStack,
    screens: ["leave"],
    flag: "allowLeaveEncashment",
    live: true,
  },
  {
    key: "attendanceChange",
    href: "/requests/attendance-change",
    title: "Attendance Change",
    description: "Correct check-in / check-out when a punch went wrong.",
    icon: CalendarClock,
    screens: ["attendanceChange"],
    live: true,
  },
  {
    key: "shiftChange",
    href: "/requests/shift-change",
    title: "Shift Change",
    description: "Request a change to your assigned shift.",
    icon: RefreshCw,
    screens: ["shiftChangeRequests"],
    live: true,
  },
  {
    key: "wfh",
    href: "/requests/wfh",
    title: "WFH Request",
    description: "Apply for work-from-home days.",
    icon: Home,
    screens: ["wfhRequests"],
    live: true,
  },
  {
    key: "onDuty",
    href: "/requests/on-duty",
    title: "On Duty",
    description: "Submit on-duty / outdoor duty requests.",
    icon: BriefcaseBusiness,
    screens: ["onDutyRequests"],
    live: true,
  },
  {
    key: "overtime",
    href: "/requests/overtime",
    title: "Overtime",
    description: "Request overtime approval for extra hours.",
    icon: Clock3,
    screens: ["overtimeRequests"],
    live: true,
  },
  {
    key: "compOff",
    href: "/requests/comp-off",
    title: "Comp Off",
    description: "Request compensatory off for worked holidays or OT.",
    icon: MoonStar,
    screens: ["compOff"],
    live: true,
  },
  {
    key: "loans",
    href: "/requests/loans",
    title: "Loans",
    description: "Apply for employee loan requests.",
    icon: Banknote,
    screens: ["loans"],
    live: true,
  },
  {
    key: "advances",
    href: "/requests/advances",
    title: "Advances",
    description: "Request salary advances.",
    icon: Coins,
    screens: ["advances"],
    live: false,
  },
];

export function getRequestTypeByHref(href) {
  return REQUEST_TYPES.find((item) => item.href === href) || null;
}

export function getRequestTypeByKey(key) {
  return REQUEST_TYPES.find((item) => item.key === key) || null;
}
