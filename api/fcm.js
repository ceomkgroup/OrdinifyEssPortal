import api from "@/lib/axios";

function unwrap(data, fallbackMessage) {
  if (!data?.success) {
    const err = new Error(data?.message || fallbackMessage);
    err.code = data?.code || data?.error;
    err.data = data?.data ?? data;
    throw err;
  }
  return data;
}

function toApiError(err, fallbackMessage) {
  if (err?.status || err?.code || err?.data) {
    const next = new Error(
      err?.data?.message || err.message || fallbackMessage
    );
    next.status = err.status;
    next.code = err.code || err.data?.code || err.data?.error;
    next.data = err.data?.data ?? err.data;
    return next;
  }
  return err;
}

/** Same token in-flight → one POST (Strict Mode / remount safe). */
const registerInflight = new Map();

export async function registerFcmToken({ token, platform = "web" }) {
  if (!token) {
    const err = new Error("Missing FCM token.");
    err.code = "MISSING_FCM_TOKEN";
    throw err;
  }

  const key = `${platform}:${token}`;
  if (registerInflight.has(key)) {
    return registerInflight.get(key);
  }

  const run = (async () => {
    try {
      const { data } = await api.post("/api/employee/portal/fcm-token", {
        token,
        platform,
      });
      return unwrap(data, "Failed to register FCM token");
    } catch (err) {
      throw toApiError(err, "Failed to register FCM token");
    } finally {
      registerInflight.delete(key);
    }
  })();

  registerInflight.set(key, run);
  return run;
}

export async function unregisterFcmToken(token) {
  if (!token) return null;
  try {
    const { data } = await api.delete("/api/employee/portal/fcm-token", {
      data: { token },
    });
    return unwrap(data, "Failed to unregister FCM token");
  } catch (err) {
    throw toApiError(err, "Failed to unregister FCM token");
  }
}
