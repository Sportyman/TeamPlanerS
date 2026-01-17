
// Fix: Use standard modular imports for Firebase v9+ to resolve 'initializeApp' export issue
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

/**
 * Firebase configuration using environment variables.
 * We use process.env instead of import.meta.env because in this specific 
 * environment, process.env is the standard way to access injected secrets.
 */
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase instance
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable Offline Persistence for robust use in field conditions
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
      console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
      console.warn('Persistence not supported by browser');
  }
});
