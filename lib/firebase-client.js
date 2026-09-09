import { initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

let appInstance = null;
let messagingInstance = null;

function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId
  );
}

export async function getWebMessaging() {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;
  if (!hasFirebaseConfig()) return null;
  if (!(await isSupported())) return null;

  if (!appInstance) appInstance = initializeApp(firebaseConfig);
  if (!messagingInstance) messagingInstance = getMessaging(appInstance);
  return messagingInstance;
}

export async function getWebFcmToken() {
  const messaging = await getWebMessaging();
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";
  if (!messaging || !vapidKey) return null;

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  return getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
}

export async function bindForegroundMessages(onPayload) {
  const messaging = await getWebMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, onPayload);
}
