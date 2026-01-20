
import { useState } from 'react';
import { useAppStore } from '../../store';
import { addSuperAdminToCloud, removeSuperAdminFromCloud } from '../../services/auth/superAdminService';
import { setClubAccessLevel } from '../../services/auth/clubAdminService';
import { AccessLevel, ClubID, Role } from '../../types';
import { addLog } from '../../services/syncService';

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
      
      // 1. Update Firestore Membership
      await setClubAccessLevel(clubId, uid, level);
      
      // 2. Immediate Local UI Refresh for the People List
      const targetPerson = people.find(p => p.id === uid && p.clubId === clubId);
      if (targetPerson) {
          let newRole = Role.MEMBER;
          if (level >= AccessLevel.CLUB_ADMIN) newRole = Role.INSTRUCTOR;
          else if (level >= AccessLevel.STAFF) newRole = Role.VOLUNTEER;
          else if (level === AccessLevel.NONE) newRole = Role.GUEST;
          
          updatePerson({ ...targetPerson, role: newRole });
          addLog(`Locally updated role for ${targetPerson.name} to ${newRole}`, 'SYNC');
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
