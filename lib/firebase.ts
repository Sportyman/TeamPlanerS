// Standard modular initialization for Firebase v9+
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

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

// Initializing Firestore with offline persistence support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
