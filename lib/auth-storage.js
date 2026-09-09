const ACCESS_KEY = "token";
const REFRESH_KEY = "refreshToken";
const EMPLOYEE_KEY = "employee";

const TOKEN_KEYS = new Set([
  "accessToken",
  "refreshToken",
  "token",
  "access_token",
  "refresh_token",
  "employeeAccessToken",
  "employeeRefreshToken",
]);

/** Browser session only — closing the browser clears login. */
function storage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function read(key) {
  try {
    return storage()?.getItem(key) || "";
  } catch {
    return "";
  }
}

function write(key, value) {
  try {
    storage()?.setItem(key, value);
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

function remove(key) {
  try {
    storage()?.removeItem(key);
  } catch {
    // ignore
  }
}

/** Drop any leftover persistent login from older builds. */
export function migrateAwayFromLocalStorageAuth() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    window.localStorage.removeItem(EMPLOYEE_KEY);
  } catch {
    // ignore
  }
}

export function getAccessToken() {
  return read(ACCESS_KEY);
}

export function getRefreshToken() {
  return read(REFRESH_KEY);
}

export function getStoredEmployee() {
  const raw = read(EMPLOYEE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession({ accessToken, refreshToken, employee }) {
  if (typeof window === "undefined") return;
  if (accessToken) write(ACCESS_KEY, accessToken);
  if (refreshToken) write(REFRESH_KEY, refreshToken);
  if (employee) write(EMPLOYEE_KEY, JSON.stringify(employee));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  remove(ACCESS_KEY);
  remove(REFRESH_KEY);
  remove(EMPLOYEE_KEY);
  migrateAwayFromLocalStorageAuth();
}

/**
 * Login /me responses vary:
 * 1) { data: { employee, accessToken } }
 * 2) { data: { employeeId, firstName, ... }, accessToken }  ← Ordinify login
 * 3) { data: employee fields only }
 */
export function pickEmployee(source) {
  if (!source || typeof source !== "object") return null;

  if (source.employee && typeof source.employee === "object") {
    return source.employee;
  }
  if (source.user && typeof source.user === "object") return source.user;
  if (source.profile && typeof source.profile === "object") {
    return source.profile;
  }

  const looksLikeEmployee = Boolean(
    source.employeeId ||
      source.employeeCode ||
      source.firstName ||
      source.email ||
      source.fullName
  );

  if (!looksLikeEmployee) return null;

  const employee = {};
  for (const [key, value] of Object.entries(source)) {
    if (TOKEN_KEYS.has(key)) continue;
    employee[key] = value;
  }
  return employee;
}

export function normalizeAuthPayload(payload = {}) {
  const root = payload || {};
  const data = root.data || root;

  const accessToken =
    root.accessToken ||
    data.accessToken ||
    data.token ||
    data.access_token ||
    data.employeeAccessToken ||
    "";

  const refreshToken =
    root.refreshToken ||
    data.refreshToken ||
    data.refresh_token ||
    data.employeeRefreshToken ||
    "";

  const employee = pickEmployee(data) || pickEmployee(root);

  return { accessToken, refreshToken, employee, raw: data };
}
