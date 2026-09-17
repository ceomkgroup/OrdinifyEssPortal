const MEDIA_BASE = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  "https://pub-9bbbaa6f881049ec904e8d165b707f3f.r2.dev"
).replace(/\/$/, "");

function mediaBaseOrigin() {
  if (!MEDIA_BASE) return null;
  try {
    return new URL(MEDIA_BASE).origin;
  } catch {
    return null;
  }
}

function isPublicMediaHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (!host) return false;
  return host.endsWith(".r2.dev") || host.endsWith(".r2.cloudflarestorage.com");
}

function isOurMediaUrl(url) {
  const baseOrigin = mediaBaseOrigin();
  if (baseOrigin && url.origin === baseOrigin) return true;
  return isPublicMediaHost(url.hostname);
}

/**
 * Strip public CDN / R2 host. Returns the storage key the API should persist
 * (e.g. employee_photo/<id>/file.png). Never returns a public r2.dev URL.
 */
export function toMediaKey(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^\//, "");
  }

  try {
    const url = new URL(trimmed);
    if (!isOurMediaUrl(url)) return trimmed;
    const key = decodeURIComponent(url.pathname || "").replace(/^\//, "");
    return key || null;
  } catch {
    return trimmed.replace(/^\//, "");
  }
}

/** Key only — never an http(s) URL. Use this on write APIs (photoUrl, etc.). */
export function toStorageKey(value) {
  const key = toMediaKey(value);
  if (!key || /^https?:\/\//i.test(key)) return null;
  return key;
}

function isPlainObject(value) {
  return Boolean(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Recursively replace public R2/CDN URLs with storage keys on anything
 * the portal sends to the API (JSON or FormData). Display still uses
 * resolveMediaUrl locally.
 */
export function sanitizeOutgoingMedia(data) {
  if (data == null) return data;
  if (typeof data === "string") {
    return toMediaKey(data) ?? data;
  }
  if (typeof File !== "undefined" && data instanceof File) return data;
  if (typeof Blob !== "undefined" && data instanceof Blob) return data;
  if (typeof FormData !== "undefined" && data instanceof FormData) {
    const next = new FormData();
    for (const [key, value] of data.entries()) {
      next.append(key, sanitizeOutgoingMedia(value));
    }
    return next;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeOutgoingMedia(item));
  }
  if (isPlainObject(data)) {
    const next = {};
    for (const [key, value] of Object.entries(data)) {
      next[key] = sanitizeOutgoingMedia(value);
    }
    return next;
  }
  return data;
}

/**
 * API often returns relative keys like:
 *   employee_photo/<id>/file.png
 * Full CDN base (NEXT_PUBLIC_MEDIA_BASE_URL) is prepended here for display only.
 */
export function resolveMediaUrl(path) {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;
  const key = toMediaKey(trimmed);
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;
  if (!MEDIA_BASE) return key;
  return `${MEDIA_BASE}/${key.replace(/^\//, "")}`;
}

export function getPersonPhoto(person) {
  if (!person || typeof person !== "object") return null;
  return (
    person.photoUrl ||
    person.avatarUrl ||
    person.profilePhoto ||
    person.profilePicture ||
    person.photo ||
    person.imageUrl ||
    null
  );
}
