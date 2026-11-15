import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ClubID, Person } from '../../types';
import { PollEvent, WhatsAppMemberMapping } from '../../types/whatsapp';
import { addPersonToClubCloud, addLog } from '../syncService';
import { deduplicateClubPeople } from './personDedup';
import { saveWhatsAppMemberMapping } from './whatsappMutations';

export const isRawWhatsAppJid = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (/@(g\.us|c\.us|lid|broadcast|newsletter)$/i.test(trimmed)) return true;
  if (/^\d{10,}$/.test(trimmed)) return true;
  return false;
};

export const collectAvailableGroups = (
  polls: PollEvent[],
  mappings: WhatsAppMemberMapping[]
): string[] => {
  const set = new Set<string>();
  polls.forEach((p) => { if (p.group && !isRawWhatsAppJid(p.group)) set.add(p.group.trim()); });
  mappings.forEach((m) => {
    (m.groups || [])
      .filter((g) => Boolean(g) && !isRawWhatsAppJid(g))
      .forEach((g) => set.add(g.trim()));
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'));
};

export const runClubDuplicateCleanup = async (params: {
  clubId: ClubID;
  clubPeople: Person[];
  allPeople: Person[];
  mappings: WhatsAppMemberMapping[];
  attemptedSet: Set<string>;
  updatedBy?: string;
}): Promise<Person[] | null> => {
  const { clubId, clubPeople, allPeople, mappings, attemptedSet, updatedBy } = params;
  const { duplicatePairs } = deduplicateClubPeople(clubPeople);
  const safePairs = duplicatePairs.filter(
    (p) => p.strongMatch && p.remove.id.startsWith('wa_') && !attemptedSet.has(`${clubId}:${p.remove.id}`)
  );
  if (safePairs.length === 0) return null;

  safePairs.forEach((p) => attemptedSet.add(`${clubId}:${p.remove.id}`));
  const removedIds = new Set<string>();
  const keptById = new Map<string, Person>();

  for (const pair of safePairs) {
    try {
      await addPersonToClubCloud(clubId, pair.keep);
      await deleteDoc(doc(db, 'memberships', `${clubId}_${pair.remove.id}`));
      removedIds.add(pair.remove.id);
      keptById.set(pair.keep.id, pair.keep);

      const matchingMapping = mappings.find((m) =>
        (m.aliasVoterIds || [m.voterId]).some(
          (id) => `wa_${id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48)}` === pair.remove.id
        )
      );
      if (matchingMapping) {
        for (const aliasId of matchingMapping.aliasVoterIds || [matchingMapping.voterId]) {
          await saveWhatsAppMemberMapping({
            voterId: aliasId, pushName: pair.keep.name, profilePicUrl: pair.keep.photoURL,
            phone: pair.keep.phone, uid: pair.keep.id, clubId, matchedBy: 'PHONE', updatedBy: updatedBy || 'AUTO_DEDUP',
          });
        }
      }
      addLog(`Merged duplicate club member ${pair.remove.id} -> ${pair.keep.id}`, 'SYNC');
    } catch {
      // ignore transient error
    }
  }

  if (removedIds.size === 0) return null;
  return allPeople
    .filter((p) => !(p.clubId === clubId && removedIds.has(p.id)))
    .map((p) => (p.clubId === clubId && keptById.has(p.id) ? keptById.get(p.id)! : p));
};
