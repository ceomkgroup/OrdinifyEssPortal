const AUTH_PREFIXES = ["/login", "/forgot-password", "/reset-password"];

function pathOnly(href) {
  return String(href || "").split("?")[0].split("#")[0];
}

function isAuthPath(href) {
  const path = pathOnly(href);
  return AUTH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Only same-origin relative paths. Blocks protocol-relative and auth loops. */
export function getSafeInternalPath(raw, fallback = "/dashboard") {
  if (raw == null) return fallback;
  const value = String(raw).trim();
  if (!value) return fallback;

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return fallback;
  }

  if (isAuthPath(value)) return fallback;

  return value;
}

export function currentLocationPath() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

export function readNextParam() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("next") || "";
}

export function getPostLoginPath() {
  return getSafeInternalPath(readNextParam(), "/dashboard");
}

export function buildLoginHref(fromPathWithSearch = currentLocationPath()) {
  const safe = getSafeInternalPath(fromPathWithSearch, "");
  if (!safe) return "/login";
  return `/login?next=${encodeURIComponent(safe)}`;
}
