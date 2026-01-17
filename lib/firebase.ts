import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration for the "etgarim-database" project
const firebaseConfig = {
  apiKey: "AIzaSyCYGI1blVRY6ZIZSDTfST66aL_FQeBgvUk",
  authDomain: "etgarim-database.firebaseapp.com",
  projectId: "etgarim-database",
  storageBucket: "etgarim-database.firebasestorage.app",
  messagingSenderId: "969970671528",
  appId: "1:969970671528:web:7541abb86fc80a3bdc879d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);