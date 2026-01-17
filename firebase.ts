
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCybT80k4jJCoqw-9WVleR2cJYMdl2pELU",
  authDomain: "etgarim-database-f1676.firebaseapp.com",
  projectId: "etgarim-database-f1676",
  storageBucket: "etgarim-database-f1676.firebasestorage.app",
  messagingSenderId: "1057822427290",
  appId: "1:1057822427290:web:b7b084e37fd87a88da7723"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
