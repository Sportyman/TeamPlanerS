
import { db } from '../../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { AccessLevel, ClubID } from '../../types';
import { addLog } from '../syncService';

/**
 * Updates or sets the AccessLevel for a user within a specific club.
 * This directly updates the membership document.
 */
export const setClubAccessLevel = async (
  clubId: ClubID, 
  uid: string, 
  level: AccessLevel
) => {
  try {
    const membershipId = `${clubId}_${uid}`;
    const membershipRef = doc(db, 'memberships', membershipId);
    
    await updateDoc(membershipRef, {
      accessLevel: level,
      lastPermissionUpdate: new Date().toISOString()
    });
    
    addLog(`AccessLevel for user ${uid} in club ${clubId} set to ${level}`);
    return true;
  } catch (error) {
    // If document doesn't exist, we might need to handle creation elsewhere or here
    addLog(`Error setting Club Access Level: ${error}`);
    throw error;
  }
};
