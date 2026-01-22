
import { useState } from 'react';
import { useAppStore } from '../../store';
import { addSuperAdminToCloud, removeSuperAdminFromCloud } from '../../services/auth/superAdminService';
import { setClubAccessLevel } from '../../services/auth/clubAdminService';
import { AccessLevel, ClubID, Role, Person, Gender } from '../../types';
import { addLog, addPersonToClubCloud } from '../../services/syncService';

export const useAdminActions = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { protectedAdmins, addSuperAdmin, removeSuperAdmin, updatePerson, addPerson, people, activeClub } = useAppStore();

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
      
      // 2. Sync to People List
      let targetPerson = people.find(p => p.id === uid && p.clubId === clubId);
      
      let newRole = Role.MEMBER;
      if (level >= AccessLevel.CLUB_ADMIN) newRole = Role.INSTRUCTOR;
      else if (level >= AccessLevel.STAFF) newRole = Role.VOLUNTEER;
      
      if (targetPerson) {
          const updated = { ...targetPerson, role: newRole };
          updatePerson(updated);
      } else if (level >= AccessLevel.STAFF) {
          // If NOT in list and gaining staff/admin powers, MUST add as person
          const displayName = uid.includes('@') ? uid.split('@')[0] : 'מנהל חדש';
          const skeleton: Person = {
              id: uid,
              clubId,
              name: displayName,
              gender: Gender.MALE, // Default, user can update in profile
              role: newRole,
              rank: 5, // Admins get high rank by default
              isSkipper: true
          };
          
          // Add to cloud
          await addPersonToClubCloud(clubId, skeleton);
          
          // Add to local store immediately if it's the current club
          if (activeClub === clubId) {
              addPerson(skeleton);
              addLog(`Admin Sync: Added ${uid} as Person to current club ${clubId}`, 'SYNC');
          }
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
