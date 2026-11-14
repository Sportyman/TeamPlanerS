import { db } from '../../firebase';
import { deleteField, doc, setDoc, updateDoc } from 'firebase/firestore';
import { ClubID, Gender, Person, Role } from '../../types';
import { ClubWhatsAppConfig, MatchCandidate, WhatsAppMemberMapping } from '../../types/whatsapp';
import { extractPhoneFromVoterId, sanitizeDocId } from './pollFormatting';
import { handleFirestoreError, OperationType } from './firestoreError';
import { addPersonToClubCloud, addLog } from '../syncService';

export const saveWhatsAppMemberMapping = async (
  mapping: Omit<WhatsAppMemberMapping, 'id'>
): Promise<void> => {
  const docId = sanitizeDocId(mapping.voterId);
  const path = `whatsapp_members/${docId}`;
  try {
    const payload: Record<string, any> = {
      voterId: mapping.voterId.slice(0, 128),
      pushName: mapping.pushName?.slice(0, 100) || null,
      profilePicUrl: mapping.profilePicUrl?.slice(0, 600) || null,
      phone: mapping.phone?.slice(0, 32) || null,
      uid: mapping.uid?.slice(0, 128) || null,
      clubId: mapping.clubId?.slice(0, 64) || null,
      matchedBy: mapping.matchedBy || 'MANUAL',
      updatedAt: new Date().toISOString(),
      updatedBy: mapping.updatedBy || null,
    };
    if (mapping.clubId && mapping.uid) {
      payload.clubLinks = { [mapping.clubId]: mapping.uid };
    }
    await setDoc(doc(db, 'whatsapp_members', docId), payload, { merge: true });
    addLog(`Saved WhatsApp mapping ${mapping.voterId} -> ${mapping.uid} (${mapping.clubId})`, 'SYNC');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const unlinkWhatsAppMember = async (voterId: string, clubId?: ClubID): Promise<void> => {
  const docId = sanitizeDocId(voterId);
  const path = `whatsapp_members/${docId}`;
  try {
    if (clubId) {
      await updateDoc(doc(db, 'whatsapp_members', docId), {
        [`clubLinks.${clubId}`]: deleteField(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await setDoc(
        doc(db, 'whatsapp_members', docId),
        { uid: null, clubId: null, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateClubPersonRole = async (
  clubId: ClubID,
  person: Person,
  role: Role,
  isSkipper?: boolean
): Promise<Person> => {
  const updated: Person = {
    ...person,
    role,
    isSkipper: isSkipper !== undefined ? isSkipper : person.isSkipper,
  };
  await addPersonToClubCloud(clubId, updated);
  return updated;
};

export const saveClubWhatsAppConfig = async (config: ClubWhatsAppConfig): Promise<void> => {
  const path = `clubs/${config.clubId}`;
  const cleanRules = config.keywordRules.slice(0, 80).map((r) => {
    const clean: Record<string, any> = { id: r.id, keyword: r.keyword, intent: r.intent };
    if (r.role) clean.role = r.role;
    if (r.isSkipper) clean.isSkipper = true;
    if (r.grantedTags && r.grantedTags.length > 0) clean.grantedTags = r.grantedTags;
    return clean;
  });

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

export const autoLinkPhoneMatches = async (
  candidates: MatchCandidate[],
  clubId: ClubID,
  updatedBy?: string
): Promise<number> => {
  let linked = 0;
  for (const c of candidates) {
    await saveWhatsAppMemberMapping({
      voterId: c.mapping.voterId,
      pushName: c.mapping.pushName || c.person.name,
      profilePicUrl: c.mapping.profilePicUrl || c.person.photoURL,
      phone: c.mapping.phone || c.person.phone,
      uid: c.person.id,
      clubId,
      matchedBy: c.confidence === 'PHONE_EXACT' ? 'PHONE' : 'NAME',
      updatedBy: updatedBy || 'AUTO_SYNC',
    });
    linked++;
  }
  return linked;
};

export const importWhatsAppRosterToClub = async (
  clubId: ClubID,
  entries: Array<{ mapping: WhatsAppMemberMapping; role: Role; isSkipper?: boolean }>,
  updatedBy?: string
): Promise<Person[]> => {
  const created: Person[] = [];
  for (const item of entries) {
    const { mapping, role, isSkipper } = item;
    const phone = mapping.phone || extractPhoneFromVoterId(mapping.voterId) || '';
    const name = (mapping.pushName || phone || mapping.voterId.split('@')[0]).trim();
    const personId = `wa_${sanitizeDocId(mapping.voterId).slice(0, 48)}`;
    const person: Person = {
      id: personId,
      clubId,
      name,
      gender: Gender.MALE,
      role,
      rank: role === Role.INSTRUCTOR ? 5 : role === Role.VOLUNTEER ? 4 : 2,
      isSkipper: Boolean(isSkipper || role === Role.INSTRUCTOR),
      phone,
      photoURL: mapping.profilePicUrl,
      notes: 'יובא מקבוצת וואטסאפ',
      tags: ['וואטסאפ'],
    };
    await addPersonToClubCloud(clubId, person);
    await saveWhatsAppMemberMapping({
      voterId: mapping.voterId,
      pushName: name,
      profilePicUrl: mapping.profilePicUrl,
      phone,
      uid: person.id,
      clubId,
      matchedBy: 'BOT_SYNC',
      updatedBy,
    });
    created.push(person);
  }
  return created;
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
