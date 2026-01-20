
import { db } from '../../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { addLog } from '../syncService';

/**
 * Validates if an admin can be modified or removed.
 * Original admins (protectedAdmins) are immutable.
 */
export const canModifyAdmin = (targetEmail: string, protectedAdmins: string[]): boolean => {
  const normalizedTarget = targetEmail.toLowerCase().trim();
  const isProtected = protectedAdmins.some(a => a.toLowerCase().trim() === normalizedTarget);
  return !isProtected;
};

/**
 * Adds a new Super Admin to the global configuration in Firestore
 */
export const addSuperAdminToCloud = async (email: string) => {
  try {
    const configRef = doc(db, 'config', 'global');
    const normalizedEmail = email.toLowerCase().trim();
    await updateDoc(configRef, {
      superAdmins: arrayUnion(normalizedEmail)
    });
    addLog(`Super Admin added: ${normalizedEmail}`);
    return true;
  } catch (error) {
    addLog(`Error adding Super Admin: ${error}`);
    throw error;
  }
};

/**
 * Removes a Super Admin from the global configuration
 */
export const removeSuperAdminFromCloud = async (email: string, protectedAdmins: string[]) => {
  if (!canModifyAdmin(email, protectedAdmins)) {
    throw new Error("Cannot remove a protected original admin.");
  }

  try {
    const configRef = doc(db, 'config', 'global');
    const normalizedEmail = email.toLowerCase().trim();
    await updateDoc(configRef, {
      superAdmins: arrayRemove(normalizedEmail)
    });
    addLog(`Super Admin removed: ${normalizedEmail}`);
    return true;
  } catch (error) {
    addLog(`Error removing Super Admin: ${error}`);
    throw error;
  }
};
