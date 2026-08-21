import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

function getFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (process.env.NODE_ENV === 'production') {
    if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
      throw new Error("HARD REQUIREMENT: NEXT_PUBLIC_FIREBASE_* variables are required in production.");
    }
  }

  return {
    apiKey: config.apiKey || "dummy-api-key-for-build",
    authDomain: config.authDomain || "dummy",
    projectId: config.projectId || "dummy",
    storageBucket: config.storageBucket || "dummy",
    messagingSenderId: config.messagingSenderId || "dummy",
    appId: config.appId || "dummy",
  };
}

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase only on the client or if not already initialized
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
