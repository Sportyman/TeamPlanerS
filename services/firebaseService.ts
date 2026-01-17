
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  deleteDoc, 
  query,
  Firestore 
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { db, auth } from "../lib/firebase";
import { Person, BoatInventory, ClubID } from "../types";

/**
 * Multi-tenant structure in Firestore:
 * - users/{email} -> { email, isAdmin }
 * - clubs/{clubId}/members/{personId} -> Person data
 * - clubs/{clubId}/settings/inventory -> BoatInventory data
 */

// --- Auth & User Management ---

export const loginWithEmail = async (email: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const password = "password123456"; // Fixed password for demo/test purposes as requested

  try {
    // 1. Try to sign in
    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (authError: any) {
      // 2. If user doesn't exist, create them
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
        await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      } else {
        throw authError;
      }
    }

    // 3. Check/Create User Document in Firestore
    const userDocRef = doc(db, "users", normalizedEmail);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const userData = {
        email: normalizedEmail,
        isAdmin: normalizedEmail === 'shaykashay@gmail.com', // Root admin logic
      };
      await setDoc(userDocRef, userData);
      return userData;
    }

    return userDoc.data() as { email: string; isAdmin: boolean };
  } catch (error) {
    console.error("Firebase Login Error:", error);
    throw error;
  }
};

// --- Realtime Listeners ---

/**
 * Listens to members sub-collection for a specific club
 */
export const subscribeToClubMembers = (clubId: string, onData: (people: Person[]) => void) => {
  const membersRef = collection(db, "clubs", clubId, "members");
  
  return onSnapshot(membersRef, (snapshot) => {
    const people: Person[] = [];
    snapshot.forEach((doc) => {
      people.push({ id: doc.id, ...doc.data() } as Person);
    });
    onData(people);
  }, (error) => {
    console.error(`Error subscribing to members for club ${clubId}:`, error);
  });
};

/**
 * Listens to inventory settings for a specific club
 */
export const subscribeToClubInventory = (clubId: string, onData: (inv: BoatInventory) => void) => {
  const inventoryDocRef = doc(db, "clubs", clubId, "settings", "inventory");
  
  return onSnapshot(inventoryDocRef, (doc) => {
    if (doc.exists()) {
      onData(doc.data() as BoatInventory);
    }
  }, (error) => {
    console.error(`Error subscribing to inventory for club ${clubId}:`, error);
  });
};

// --- Data Mutation ---

export const addOrUpdateMember = async (clubId: string, person: Person) => {
  const memberDocRef = doc(db, "clubs", clubId, "members", person.id);
  await setDoc(memberDocRef, person, { merge: true });
};

export const deleteMember = async (clubId: string, personId: string) => {
  const memberDocRef = doc(db, "clubs", clubId, "members", personId);
  await deleteDoc(memberDocRef);
};

export const updateInventory = async (clubId: string, inventory: BoatInventory) => {
  const inventoryDocRef = doc(db, "clubs", clubId, "settings", "inventory");
  await setDoc(inventoryDocRef, inventory);
};

// --- Migration / Seeding ---

/**
 * Seeds initial data from mockData to Firebase if the club is empty
 */
export const seedInitialData = async (clubId: string, people: Person[], inventory: BoatInventory) => {
  try {
    const membersRef = collection(db, "clubs", clubId, "members");
    const snapshot = await getDocs(query(membersRef));

    // Only seed if members collection is empty
    if (snapshot.empty) {
      console.log(`Seeding initial data for club: ${clubId}...`);
      
      // 1. Upload People
      const uploadPromises = people
        .filter(p => p.clubId === clubId)
        .map(person => addOrUpdateMember(clubId, person));
      
      await Promise.all(uploadPromises);

      // 2. Upload Inventory
      await updateInventory(clubId, inventory);
      
      console.log(`Successfully seeded ${uploadPromises.length} members for ${clubId}.`);
    }
  } catch (error) {
    console.error(`Error seeding data for club ${clubId}:`, error);
  }
};
