import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// --- FIREBASE CONFIGURATION ---
// We use Vite environment variables for configuration to make it secure and manageable.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY_HERE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID"
};

// VAPID Key from Project Settings > Cloud Messaging > Web Configuration
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "YOUR_VAPID_KEY_HERE";

// Initialize Firebase only if config is valid (basic check)
let app = null;
let messaging = null;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    console.log("Firebase initialized successfully");
  } else {
    console.warn("Firebase configuration missing or invalid. Notifications will not work.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

/**
 * Request permission and get FCM token.
 * @param {ServiceWorkerRegistration} [registration] - Optional explicit service worker registration
 */
export const requestForToken = async (registration) => {
  if (!messaging) {
    console.warn("Messaging not initialized. Cannot request token.");
    return null;
  }

  try {
    // Explicitly request permission first to separate permission error from token error
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const options = { vapidKey: VAPID_KEY };
      
      // If a specific SW registration is passed, use it. 
      // This is critical for ensuring the SW file path is correct.
      if (registration) {
          options.serviceWorkerRegistration = registration;
      }

      const currentToken = await getToken(messaging, options);
      
      if (currentToken) {
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return null;
      }
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token: ', err);
    if (err.code === 'messaging/permission-blocked') {
        console.warn('User blocked notifications.');
    } else if (err.code === 'messaging/unsupported-browser') {
        console.warn('This browser does not support message reception.');
    }
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

export { messaging };