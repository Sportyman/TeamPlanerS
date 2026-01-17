
// Fix: Use standard modular imports for Firebase v9+ to resolve 'initializeApp' export issue
// @ts-ignore: Suppress error if initializeApp is not correctly recognized as an export by the TypeScript compiler
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

// Environment variables for Firebase configuration to keep credentials secure
// Fix: Cast import.meta to any to resolve "Property 'env' does not exist on type 'ImportMeta'" errors
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID
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
