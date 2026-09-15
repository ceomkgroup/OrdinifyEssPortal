export const FCM_TOKEN_KEY = "employee_fcm_token";
export const FCM_BANNER_DISMISS_KEY = "employee_fcm_banner_dismissed";

export function getStoredFcmToken() {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(FCM_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredFcmToken(token) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.sessionStorage.setItem(FCM_TOKEN_KEY, token);
  } catch {
    // ignore quota / private-mode write failures
  }
}

export function clearStoredFcmToken() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FCM_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function clearFcmSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FCM_TOKEN_KEY);
    window.sessionStorage.removeItem(FCM_BANNER_DISMISS_KEY);
  } catch {
    // ignore
  }
}

export function isFcmBannerDismissed() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(FCM_BANNER_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissFcmBanner() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FCM_BANNER_DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}

export function clearFcmBannerDismiss() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FCM_BANNER_DISMISS_KEY);
  } catch {
    // ignore
  }
}
