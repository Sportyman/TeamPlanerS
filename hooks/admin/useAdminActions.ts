
import { useState } from 'react';
import { useAppStore } from '../../store';
import { addSuperAdminToCloud, removeSuperAdminFromCloud } from '../../services/auth/superAdminService';
import { setClubAccessLevel } from '../../services/auth/clubAdminService';
import { AccessLevel, ClubID, Role, Person } from '../../types';
import { addLog, addPersonToClubCloud, triggerCloudSync } from '../../services/syncService';

export const useAdminActions = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { protectedAdmins, addSuperAdmin, removeSuperAdmin, updatePerson, people } = useAppStore();

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
      
      // 2. Sync to People List (The Display)
      let targetPerson = people.find(p => p.id === uid && p.clubId === clubId);
      
      let newRole = Role.MEMBER;
      if (level >= AccessLevel.CLUB_ADMIN) newRole = Role.INSTRUCTOR;
      else if (level >= AccessLevel.STAFF) newRole = Role.VOLUNTEER;
      
      if (targetPerson) {
          const updated = { ...targetPerson, role: newRole };
          updatePerson(updated);
          // We don't need a special cloud sync call here because App.tsx 
          // watches 'people' and triggers triggerCloudSync automatically
      } else {
          // If person not in list, create a skeleton record so they appear
          const skeleton: Person = {
              id: uid,
              clubId,
              name: uid.split('@')[0], // Fallback if name unknown
              gender: (window as any).lastSelectedGender || 'MALE' as any,
              role: newRole,
              rank: 3
          };
          await addPersonToClubCloud(clubId, skeleton);
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
