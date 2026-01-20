
import { useState } from 'react';
import { useAppStore } from '../../store';
import { addSuperAdminToCloud, removeSuperAdminFromCloud } from '../../services/auth/superAdminService';
import { setClubAccessLevel } from '../../services/auth/clubAdminService';
import { AccessLevel, ClubID } from '../../types';

export const useAdminActions = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { protectedAdmins, addSuperAdmin, removeSuperAdmin } = useAppStore();

  const promoteToSuper = async (email: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await addSuperAdminToCloud(email);
      addSuperAdmin(email); // Update local store
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
      removeSuperAdmin(email); // Update local store
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
      await setClubAccessLevel(clubId, uid, level);
      // Note: Full state refresh usually happens via fetchFromCloud trigger
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
