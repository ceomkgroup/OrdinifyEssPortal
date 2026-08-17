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

export function getAccessToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ACCESS_KEY) || "";
}

export function getRefreshToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REFRESH_KEY) || "";
}

export function getStoredEmployee() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(EMPLOYEE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession({ accessToken, refreshToken, employee }) {
  if (typeof window === "undefined") return;
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  if (employee) localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(employee));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EMPLOYEE_KEY);
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
