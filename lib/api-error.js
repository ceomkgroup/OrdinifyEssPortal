/**
 * Prefer API response message, then thrown Error message, then fallback.
 */
export function getApiErrorMessage(err, fallbackMessage = "Something went wrong") {
  if (!err) return fallbackMessage;

  const data = err.data;
  if (data && typeof data === "object" && data.message) {
    return String(data.message);
  }

  if (err.message) return String(err.message);
  return fallbackMessage;
}
