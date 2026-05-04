import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Fallback values prevent SSR crashes when .env.local is not yet configured.
// Real auth only works after you add real Firebase credentials.
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? "not-configured",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "not-configured.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? "not-configured",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "not-configured.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "000000000000",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? "1:000000000000:web:000000000000000000000000",
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
