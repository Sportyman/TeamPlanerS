import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ClubID, Gender, Person, Role } from '../../types';
import { ClubWhatsAppConfig, WhatsAppMemberMapping } from '../../types/whatsapp';
import { sanitizeDocId } from './pollFormatting';
import { handleFirestoreError, OperationType } from './firestoreError';
import { addPersonToClubCloud, addLog } from '../syncService';

export const saveWhatsAppMemberMapping = async (
  mapping: Omit<WhatsAppMemberMapping, 'id'>
): Promise<void> => {
  const docId = sanitizeDocId(mapping.voterId);
  const path = `whatsapp_members/${docId}`;
  try {
    await setDoc(
      doc(db, 'whatsapp_members', docId),
      {
        voterId: mapping.voterId.slice(0, 128),
        pushName: mapping.pushName?.slice(0, 100) || null,
        profilePicUrl: mapping.profilePicUrl?.slice(0, 600) || null,
        phone: mapping.phone?.slice(0, 32) || null,
        uid: mapping.uid?.slice(0, 128) || null,
        clubId: mapping.clubId?.slice(0, 64) || null,
        matchedBy: mapping.matchedBy || 'MANUAL',
        updatedAt: new Date().toISOString(),
        updatedBy: mapping.updatedBy || null,
      },
      { merge: true }
    );
    addLog(`Saved WhatsApp mapping ${mapping.voterId} -> ${mapping.uid}`, 'SYNC');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const unlinkWhatsAppMember = async (voterId: string): Promise<void> => {
  const docId = sanitizeDocId(voterId);
  const path = `whatsapp_members/${docId}`;
  try {
    await setDoc(
      doc(db, 'whatsapp_members', docId),
      { uid: null, clubId: null, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const saveClubWhatsAppConfig = async (config: ClubWhatsAppConfig): Promise<void> => {
  const path = `clubs/${config.clubId}`;
  const cleanRules = config.keywordRules.slice(0, 80).map((r) =>
    r.role
      ? { id: r.id, keyword: r.keyword, intent: r.intent, role: r.role }
      : { id: r.id, keyword: r.keyword, intent: r.intent }
  );

  try {
    await setDoc(
      doc(db, 'clubs', config.clubId),
      {
        whatsappConfig: {
          clubId: config.clubId,
          linkedGroups: config.linkedGroups.slice(0, 30),
          keywordRules: cleanRules,
          pollColors: config.pollColors || {},
          activePollId: config.activePollId || null,
          updatedAt: new Date().toISOString(),
        },
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const createClubGuestFromVoter = async (params: {
  clubId: ClubID;
  voterId: string;
  displayName: string;
  phone?: string;
  profilePicUrl?: string;
  persistToClub: boolean;
  updatedBy?: string;
}): Promise<Person> => {
  const guestId = `guest_wa_${sanitizeDocId(params.voterId).slice(0, 40)}_${Date.now().toString().slice(-4)}`;
  const guest: Person = {
    id: guestId,
    clubId: params.clubId,
    name: params.displayName,
    gender: Gender.MALE,
    role: Role.GUEST,
    rank: 2,
    phone: params.phone || '',
    notes: 'אורח מסקר וואטסאפ',
    tags: ['אורח', 'וואטסאפ'],
  };

  if (params.persistToClub) {
    await addPersonToClubCloud(params.clubId, guest);
    await saveWhatsAppMemberMapping({
      voterId: params.voterId,
      pushName: params.displayName,
      profilePicUrl: params.profilePicUrl,
      phone: params.phone,
      uid: guest.id,
      clubId: params.clubId,
      matchedBy: 'MANUAL',
      updatedBy: params.updatedBy,
    });
  }
  return guest;
};
