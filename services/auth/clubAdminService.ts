
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { AccessLevel, ClubID } from '../../types';
import { addLog } from '../syncService';

/**
 * Updates or sets the AccessLevel for a user within a specific club.
 * This uses setDoc with merge to prevent 'No document to update' errors.
 */
export const setClubAccessLevel = async (
  clubId: ClubID, 
  uid: string, 
  level: AccessLevel
) => {
  try {
    const membershipId = `${clubId}_${uid}`;
    const membershipRef = doc(db, 'memberships', membershipId);
    
    // Using setDoc with merge: true ensures the document is created if it doesn't exist
    await setDoc(membershipRef, {
      uid,
      clubId,
      accessLevel: level,
      lastPermissionUpdate: new Date().toISOString()
    }, { merge: true });
    
    addLog(`AccessLevel for user ${uid} in club ${clubId} set to ${level}`);
    return true;
  } catch (error) {
    addLog(`Error setting Club Access Level: ${error}`, 'ERROR');
    throw error;
  }
};
