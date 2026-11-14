import { ClubID, Person } from '../../types';
import { VoteChangeAlert, WhatsAppMemberMapping } from '../../types/whatsapp';
import { cleanWhatsAppPhone, normalizeName, normalizePhone } from './pollFormatting';
import { extractPhoneFromText, getPicKey } from './personDedup';

const scoreMapping = (m: WhatsAppMemberMapping, clubId?: ClubID): number => {
  let score = 0;
  if (m.voterId.endsWith('@c.us')) score += 100;
  if (cleanWhatsAppPhone(m.phone, m.voterId)) score += 40;
  if ((clubId && m.clubLinks?.[clubId]) || (!clubId && m.uid)) score += 30;
  if (m.pushName && !extractPhoneFromText(m.pushName) && !/^\d+$/.test(m.pushName.trim())) score += 20;
  if (m.profilePicUrl) score += 10;
  score += (m.groups?.length || 0);
  return score;
};

export const getMappingCanonicalPhone = (m: Pick<WhatsAppMemberMapping, 'phone' | 'voterId' | 'pushName'>): string | undefined =>
  cleanWhatsAppPhone(m.phone, m.voterId) || extractPhoneFromText(m.pushName);

export const deduplicateWhatsAppMappings = (
  mappings: WhatsAppMemberMapping[],
  clubId?: ClubID
): WhatsAppMemberMapping[] => {
  const sorted = [...mappings].sort((a, b) => scoreMapping(b, clubId) - scoreMapping(a, clubId));
  const result: WhatsAppMemberMapping[] = [];
  const byUid = new Map<string, number>();
  const byPhone = new Map<string, number>();
  const byPic = new Map<string, number>();
  const byName = new Map<string, number>();

  sorted.forEach((src) => {
    const srcUid = (clubId ? src.clubLinks?.[clubId] : undefined) || src.uid || '';
    const srcPhone = getMappingCanonicalPhone(src) || '';
    const srcPic = getPicKey(src.profilePicUrl);
    const srcName = normalizeName(src.pushName);

    let matchIdx: number | undefined;
    if (srcUid && byUid.has(srcUid)) matchIdx = byUid.get(srcUid);
    if (matchIdx === undefined && srcPhone && byPhone.has(srcPhone)) matchIdx = byPhone.get(srcPhone);
    if (matchIdx === undefined && srcPic && byPic.has(srcPic)) {
      const candidate = result[byPic.get(srcPic)!];
      const candPhone = getMappingCanonicalPhone(candidate) || '';
      if (!srcPhone || !candPhone || srcPhone === candPhone) matchIdx = byPic.get(srcPic);
    }
    if (matchIdx === undefined && srcName.length >= 3 && byName.has(srcName)) {
      const candidate = result[byName.get(srcName)!];
      const candPhone = getMappingCanonicalPhone(candidate) || '';
      if (!srcPhone || !candPhone || srcPhone === candPhone) matchIdx = byName.get(srcName);
    }

    if (matchIdx === undefined) {
      const idx = result.length;
      const cloned: WhatsAppMemberMapping = {
        ...src,
        phone: srcPhone || undefined,
        aliasVoterIds: Array.from(new Set([src.voterId, ...(src.aliasVoterIds || [])])),
        groups: src.groups ? [...src.groups] : undefined,
        clubLinks: src.clubLinks ? { ...src.clubLinks } : undefined,
      };
      result.push(cloned);
      if (srcUid) byUid.set(srcUid, idx);
      if (srcPhone) byPhone.set(srcPhone, idx);
      if (srcPic) byPic.set(srcPic, idx);
      if (srcName.length >= 3) byName.set(srcName, idx);
      return;
    }

    const target = result[matchIdx];
    target.aliasVoterIds = Array.from(
      new Set([...(target.aliasVoterIds || [target.voterId]), src.voterId, ...(src.aliasVoterIds || [])])
    );
    if ((!target.pushName || extractPhoneFromText(target.pushName)) && src.pushName && !extractPhoneFromText(src.pushName)) {
      target.pushName = src.pushName;
    } else if (!target.pushName && src.pushName) {
      target.pushName = src.pushName;
    }
    if (!target.profilePicUrl && src.profilePicUrl) target.profilePicUrl = src.profilePicUrl;
    if (!target.phone && srcPhone) target.phone = srcPhone;
    if (!target.uid && src.uid) target.uid = src.uid;
    if (!target.clubId && src.clubId) target.clubId = src.clubId;
    if (src.clubLinks) target.clubLinks = { ...(target.clubLinks || {}), ...src.clubLinks };
    if (src.groups?.length) {
      target.groups = Array.from(new Set([...(target.groups || []), ...src.groups]));
    }
    if (srcUid && !byUid.has(srcUid)) byUid.set(srcUid, matchIdx);
    if (srcPhone && !byPhone.has(srcPhone)) byPhone.set(srcPhone, matchIdx);
    if (srcPic && !byPic.has(srcPic)) byPic.set(srcPic, matchIdx);
    if (srcName.length >= 3 && !byName.has(srcName)) byName.set(srcName, matchIdx);
  });

  return result;
};

export const isNumericFallbackName = (name?: string): boolean =>
  !name || /^[\d\s+()-]{7,}$/.test(name.trim());

export const enrichVoteAlertsWithContacts = (
  alerts: VoteChangeAlert[],
  mappings: WhatsAppMemberMapping[],
  people: Person[]
): VoteChangeAlert[] => {
  if (alerts.length === 0) return alerts;
  const byVoter = new Map<string, WhatsAppMemberMapping>();
  const byPhone = new Map<string, WhatsAppMemberMapping>();
  mappings.forEach((m) => {
    (m.aliasVoterIds || [m.voterId]).forEach((id) => byVoter.set(id, m));
    const p = cleanWhatsAppPhone(m.phone, m.voterId);
    if (p) byPhone.set(p, m);
  });
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const peopleByPhone = new Map<string, Person>();
  people.forEach((p) => {
    const norm = normalizePhone(p.phone);
    if (norm) peopleByPhone.set(norm, p);
  });

  return alerts.map((alert) => {
    const phone = cleanWhatsAppPhone(undefined, alert.voterId);
    const mapping = byVoter.get(alert.voterId) || (phone ? byPhone.get(phone) : undefined);
    const person = (alert.personId ? peopleById.get(alert.personId) : undefined)
      || (mapping?.uid ? peopleById.get(mapping.uid) : undefined)
      || (phone ? peopleByPhone.get(phone) : undefined);
    const bestName = person?.name || mapping?.pushName;
    return {
      ...alert,
      personId: alert.personId || person?.id,
      displayName: isNumericFallbackName(alert.displayName) && bestName ? bestName : (person?.name || alert.displayName),
      profilePicUrl: alert.profilePicUrl || mapping?.profilePicUrl || person?.photoURL,
    };
  });
};
