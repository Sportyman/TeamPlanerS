
import { useState } from 'react';
import { useAppStore } from '../../store';
import { addSuperAdminToCloud, removeSuperAdminFromCloud } from '../../services/auth/superAdminService';
import { setClubAccessLevel } from '../../services/auth/clubAdminService';
import { AccessLevel, ClubID, Role, Person, Gender } from '../../types';
import { addLog, addPersonToClubCloud } from '../../services/syncService';

export const useAdminActions = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { protectedAdmins, addSuperAdmin, removeSuperAdmin } = useAppStore();

  const promoteToSuper = async (email: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await addSuperAdminToCloud(email);
      addSuperAdmin(email); 
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to promote to Super Admin");
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const demoteSuper = async (email: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await removeSuperAdminFromCloud(email, protectedAdmins);
      removeSuperAdmin(email); 
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to demote Super Admin");
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const updateClubLevel = async (clubId: ClubID, uid: string, level: AccessLevel) => {
    setIsProcessing(true);
    setError(null);
    try {
      addLog(`Updating Club Level for ${uid} to ${level}`, 'INFO');
      
      // 1. Update Firestore Membership (The Authority)
      await setClubAccessLevel(clubId, uid, level);
      
      // 2. Logic for ensuring a Person entry exists if they are now staff/admin
      if (level >= AccessLevel.STAFF) {
          let newRole = Role.MEMBER;
          if (level >= AccessLevel.CLUB_ADMIN) newRole = Role.INSTRUCTOR;
          else if (level >= AccessLevel.STAFF) newRole = Role.VOLUNTEER;

          const displayName = uid.includes('@') ? uid.split('@')[0] : 'מנהל חדש';
          const skeleton: Person = {
              id: uid,
              clubId,
              name: displayName,
              gender: Gender.MALE, 
              role: newRole,
              rank: 5, 
              isSkipper: true
          };
          
          await addPersonToClubCloud(clubId, skeleton);
          addLog(`Admin Sync: Ensured ${uid} is synced as Person to club ${clubId} in cloud`, 'SYNC');
      }

      return true;
    } catch (err: any) {
      setError(err.message || "Failed to update Club Access Level");
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    promoteToSuper,
    demoteSuper,
    updateClubLevel,
    isProcessing,
    error,
    setError
  };
};
