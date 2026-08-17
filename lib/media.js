const MEDIA_BASE = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  "https://pub-9bbbaa6f881049ec904e8d165b707f3f.r2.dev"
).replace(/\/$/, "");

/**
 * API often returns relative keys like:
 *   employee_photo/<id>/file.png
 * Full CDN base (NEXT_PUBLIC_MEDIA_BASE_URL) is prepended here.
 */
export function resolveMediaUrl(path) {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (!MEDIA_BASE) return trimmed;
  return `${MEDIA_BASE}/${trimmed.replace(/^\//, "")}`;
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
