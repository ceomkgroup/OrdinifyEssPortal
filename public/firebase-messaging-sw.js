/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBDUBAomYEtfc3gbEEnlkgFDa5J6bG40Ok",
  authDomain: "hrms-3f8a8.firebaseapp.com",
  projectId: "hrms-3f8a8",
  storageBucket: "hrms-3f8a8.firebasestorage.app",
  messagingSenderId: "985931232140",
  appId: "1:985931232140:web:85616a4f48055750429ca9",
  measurementId: "G-2WMW0BFGH2",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "New notification";
  const options = {
    body: payload?.notification?.body || "",
    icon: "/file.svg",
  };
  self.registration.showNotification(title, options);
});
