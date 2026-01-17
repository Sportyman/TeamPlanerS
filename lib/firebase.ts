
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";

/**
 * Firebase configuration with hardcoded values for reliable development environment connectivity.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCYGI1blVRY6ZIZSDTfST66aL_FQeBgvUk",
  authDomain: "etgarim-database.firebaseapp.com",
  projectId: "etgarim-database",
  storageBucket: "etgarim-database.firebasestorage.app",
  messagingSenderId: "969970671528",
  appId: "1:969970671528:web:7541abb86fc80a3bdc879d"
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
