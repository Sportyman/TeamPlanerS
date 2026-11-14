import { Person, Role } from '../../types';
import { cleanWhatsAppPhone, normalizeName, normalizePhone } from './pollFormatting';

export const getPicKey = (url?: string): string => (url ? url.split('?')[0].trim() : '');

export const extractPhoneFromText = (text?: string): string | undefined => {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (!trimmed || /[^\d+\s()-]/.test(trimmed)) return undefined;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 13) return undefined;
  return normalizePhone(digits);
};

export const getPersonCanonicalPhone = (p: Pick<Person, 'id' | 'name' | 'phone'>): string | undefined => {
  const lidHint = p.id.startsWith('wa_') && p.id.endsWith('_lid') && p.phone ? `${p.phone}@lid` : undefined;
  return cleanWhatsAppPhone(p.phone, lidHint) || extractPhoneFromText(p.name);
};

const scorePerson = (p: Person): number => {
  let score = 0;
  if (!p.id.startsWith('wa_') && !p.id.startsWith('guest_wa_')) score += 200;
  if (p.role !== Role.UNASSIGNED) score += 100;
  if (cleanWhatsAppPhone(p.phone)) score += 50;
  if (!extractPhoneFromText(p.name)) score += 30;
  score += Math.min((p.attendanceCount || 0) * 5, 50);
  if (p.photoURL) score += 10;
  if (p.isSkipper) score += 8;
  if (p.tags?.length) score += 4;
  return score;
};

export interface DuplicatePair {
  keep: Person;
  remove: Person;
  strongMatch: boolean;
}

export interface DeduplicatedPeopleResult {
  people: Person[];
  duplicatePairs: DuplicatePair[];
  aliasToKeepId: Map<string, string>;
}

export const deduplicateClubPeople = (clubPeople: Person[]): DeduplicatedPeopleResult => {
  const sorted = [...clubPeople].sort((a, b) => scorePerson(b) - scorePerson(a));
  const result: Person[] = [];
  const byPhone = new Map<string, number>();
  const byPic = new Map<string, number>();
  const byName = new Map<string, number>();
  const duplicatePairs: DuplicatePair[] = [];
  const aliasToKeepId = new Map<string, string>();

  sorted.forEach((src) => {
    const srcPhone = getPersonCanonicalPhone(src) || '';
    const srcPic = getPicKey(src.photoURL);
    const srcName = normalizeName(src.name);

    let matchIdx: number | undefined;
    let strongMatch = false;

    if (srcPhone && byPhone.has(srcPhone)) {
      matchIdx = byPhone.get(srcPhone);
      strongMatch = true;
    }
    if (matchIdx === undefined && srcPic && byPic.has(srcPic)) {
      const cand = result[byPic.get(srcPic)!];
      const candPhone = getPersonCanonicalPhone(cand) || '';
      if (!srcPhone || !candPhone || srcPhone === candPhone) {
        matchIdx = byPic.get(srcPic);
        strongMatch = true;
      }
    }
    if (matchIdx === undefined && srcName.length >= 3 && byName.has(srcName)) {
      const cand = result[byName.get(srcName)!];
      const candPhone = getPersonCanonicalPhone(cand) || '';
      if (!srcPhone || !candPhone || srcPhone === candPhone) {
        matchIdx = byName.get(srcName);
      }
    }

    if (matchIdx === undefined) {
      const idx = result.length;
      const cleanPhone = srcPhone || cleanWhatsAppPhone(src.phone) || '';
      const cloned: Person = {
        ...src,
        phone: cleanPhone || src.phone,
        tags: src.tags ? [...src.tags] : [],
      };
      result.push(cloned);
      aliasToKeepId.set(src.id, cloned.id);
      if (srcPhone) byPhone.set(srcPhone, idx);
      if (srcPic) byPic.set(srcPic, idx);
      if (srcName.length >= 3) byName.set(srcName, idx);
      return;
    }

    const keep = result[matchIdx];
    const keepRealName = !extractPhoneFromText(keep.name);
    const srcRealName = !extractPhoneFromText(src.name);
    if (!keepRealName && srcRealName) keep.name = src.name;
    if (keep.role === Role.UNASSIGNED && src.role !== Role.UNASSIGNED) keep.role = src.role;
    if (!keep.photoURL && src.photoURL) keep.photoURL = src.photoURL;
    if (!cleanWhatsAppPhone(keep.phone) && srcPhone) keep.phone = srcPhone;
    keep.isSkipper = Boolean(keep.isSkipper || src.isSkipper);
    keep.attendanceCount = Math.max(keep.attendanceCount || 0, src.attendanceCount || 0);
    if (!keep.lastAttendedAt && src.lastAttendedAt) keep.lastAttendedAt = src.lastAttendedAt;
    if (!keep.notes && src.notes) keep.notes = src.notes;
    keep.tags = Array.from(new Set([...(keep.tags || []), ...(src.tags || [])]));

    aliasToKeepId.set(src.id, keep.id);
    duplicatePairs.push({ keep: { ...keep }, remove: src, strongMatch });
    if (srcPhone && !byPhone.has(srcPhone)) byPhone.set(srcPhone, matchIdx);
    if (srcPic && !byPic.has(srcPic)) byPic.set(srcPic, matchIdx);
    if (srcName.length >= 3 && !byName.has(srcName)) byName.set(srcName, matchIdx);
  });

  return { people: result, duplicatePairs, aliasToKeepId };
};
