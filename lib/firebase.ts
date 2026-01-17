// Fix: Re-import initializeApp from firebase/app to ensure named exports are correctly recognized by the TypeScript compiler
import { initializeApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCYGI1blVRY6ZIZSDTfST66aL_FQeBgvUk",
  authDomain: "etgarim-database.firebaseapp.com",
  projectId: "etgarim-database",
  storageBucket: "etgarim-database.firebasestorage.app",
  messagingSenderId: "969970671528",
  appId: "1:969970671528:web:7541abb86fc80a3bdc879d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// האתחול החדש שכולל תמיכה באופליין (Persistence) בצורה מודרנית
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});