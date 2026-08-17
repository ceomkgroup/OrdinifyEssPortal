/**
 * Company modules drive which portal screens / widgets are available.
 *
 * API: GET /api/employee/portal/company-modules
 *  - screenControllers: string[]  → enabled product screens
 *  - feature flags: allowLeaveEncashment, overtimeModule, …
 *
 * ALSO apply employee permissions on top (see lib/permissions.js):
 * e.g. attendance module ON + allowWebPunch false → show status, hide punch actions.
 */

/** Sidebar / route → required screenControllers (any match = show) */
export const ROUTE_MODULES = {
  "/dashboard": ["dashboard"],
  "/profile": null, // always available in ESS
  "/attendance": ["attendance"],
  "/leave": ["leave"],
  "/requests": [
    "leave",
    "wfhRequests",
    "onDutyRequests",
    "compOff",
    "overtimeRequests",
    "shiftChangeRequests",
    "attendanceChange",
    "loans",
    "advances",
  ],
  "/requests/attendance-change": ["attendanceChange"],
  "/payslip": ["payroll"],
  "/team": ["employees"],
  "/holidays": ["companyHolidays"],
  "/reports": ["reports"],
  "/settings": ["settings"],
};

/** Dashboard widget visibility */
export const WIDGET_MODULES = {
  leaveBalance: ["leave"],
  attendanceMonth: ["attendance"],
  weeklyHours: ["attendance"],
  pendingRequests: [
    "leave",
    "wfhRequests",
    "onDutyRequests",
    "compOff",
    "overtimeRequests",
    "shiftChangeRequests",
    "loans",
    "advances",
  ],
  upcomingHolidays: ["companyHolidays"],
  teamMembers: ["employees"],
  lastPayslip: ["payroll"],
  companySettings: ["settings"],
  punchWidget: ["attendance", "dashboard"],
  punchPermissions: ["attendance", "dashboard"],
  todayStatus: ["attendance", "dashboard"],
  shift: ["shifts", "dashboard"],
};

/** Pending-request tile → module / feature flag */
export const REQUEST_TILE_MODULES = {
  leave: { screens: ["leave"] },
  shiftChange: { screens: ["shiftChangeRequests"] },
  wfh: { screens: ["wfhRequests"] },
  onDuty: { screens: ["onDutyRequests"] },
  overtime: { screens: ["overtimeRequests"], flag: "overtimeModule" },
  compOff: { screens: ["compOff"] },
  loans: { screens: ["loans"] },
  advances: { screens: ["advances"] },
  encashment: { screens: ["leave"], flag: "allowLeaveEncashment" },
  attendanceChange: { screens: ["attendanceChange"] },
};

export function normalizeModules(raw = {}) {
  const screenControllers = Array.isArray(raw.screenControllers)
    ? raw.screenControllers
    : [];

  return {
    screenControllers,
    screens: new Set(screenControllers),
    allowLeaveEncashment: Boolean(raw.allowLeaveEncashment),
    breakManagement: Boolean(raw.breakManagement),
    overtimeModule: Boolean(raw.overtimeModule),
    geofence: Boolean(raw.geofence),
    liveTracking: Boolean(raw.liveTracking),
    penaltiesModule: Boolean(raw.penaltiesModule),
    shiftRulesModule: Boolean(raw.shiftRulesModule),
    halfDayRules: Boolean(raw.halfDayRules),
  };
}

export function hasScreen(modules, key) {
  if (!key) return true;
  if (!modules?.screens) return false;
  return modules.screens.has(key);
}

export function hasAnyScreen(modules, keys = []) {
  if (!keys?.length) return true;
  return keys.some((key) => hasScreen(modules, key));
}

export function hasFlag(modules, flag) {
  if (!flag) return true;
  return Boolean(modules?.[flag]);
}

export function canAccessRoute(modules, href) {
  const required = ROUTE_MODULES[href];
  if (required == null) return true;
  // While modules still loading, don't hide core routes aggressively.
  if (!modules) return href === "/dashboard" || href === "/profile";
  return hasAnyScreen(modules, required);
}

export function canShowWidget(modules, widgetKey) {
  const required = WIDGET_MODULES[widgetKey];
  if (!required) return true;
  if (!modules) return false;
  return hasAnyScreen(modules, required);
}

export function canShowRequestTile(modules, tileKey) {
  const rule = REQUEST_TILE_MODULES[tileKey];
  if (!rule) return true;
  if (!modules) return false;
  if (!hasAnyScreen(modules, rule.screens)) return false;
  if (rule.flag && !hasFlag(modules, rule.flag)) return false;
  return true;
}
