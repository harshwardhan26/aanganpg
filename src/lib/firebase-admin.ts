import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (getApps().length === 0) {
  if (process.env.FIREBASE_PROJECT_ID) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace literal \n with actual newlines for Vercel/Docker env vars
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    // Fallback for build time or development without credentials
    initializeApp();
  }
}

export const adminAuth = getAuth();
