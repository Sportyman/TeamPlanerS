import { Role } from '../../types';
import {
  KeywordRule,
  PollColorToken,
  PollOptionClassification,
} from '../../types/whatsapp';
import { DEFAULT_KEYWORD_RULES, POLL_COLOR_PALETTE } from '../../config/whatsappDefaults';

export const normalizePhone = (phone?: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('972') && digits.length >= 11) return '0' + digits.slice(3);
  if (digits.length === 9 && digits.startsWith('5')) return '0' + digits;
  return digits;
};

export const normalizeName = (name?: string): string =>
  (name || '')
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[^a-zA-Z0-9\u05D0-\u05EA\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const namesMatch = (a?: string, b?: string): boolean => {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb || na.length < 3) return false;
  if (na === nb) return true;
  const pa = na.split(' ').sort().join(' ');
  const pb = nb.split(' ').sort().join(' ');
  return pa === pb && na.split(' ').length >= 2;
};

export const extractPhoneFromVoterId = (voterId: string): string | undefined => {
  if (!voterId || voterId.endsWith('@lid')) return undefined;
  const raw = voterId.split('@')[0];
  const normalized = normalizePhone(raw);
  return normalized.length >= 9 ? normalized : undefined;
};

export const sanitizeDocId = (rawId: string): string =>
  rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);

export const toTimestampMs = (val: unknown): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val < 1e12 ? val * 1000 : val;
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val === 'object' && val !== null) {
    const obj = val as { toMillis?: () => number; seconds?: number };
    if (typeof obj.toMillis === 'function') return obj.toMillis();
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
  }
  return 0;
};

export const formatHebrewPollDate = (ms: number): { displayDate: string; displayTime: string } => {
  if (!ms) return { displayDate: 'תאריך לא ידוע', displayTime: '' };
  const date = new Date(ms);
  const weekday = new Intl.DateTimeFormat('he-IL', { weekday: 'long' }).format(date);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return { displayDate: `${weekday} · ${day}.${month}`, displayTime: `${hours}:${mins}` };
};

export const getPollColorToken = (pollId: string, customColorId?: string): PollColorToken => {
  if (customColorId) {
    const found = POLL_COLOR_PALETTE.find((c) => c.id === customColorId);
    if (found) return found;
  }
  let hash = 0;
  for (let i = 0; i < pollId.length; i++) hash = (hash * 31 + pollId.charCodeAt(i)) >>> 0;
  return POLL_COLOR_PALETTE[hash % POLL_COLOR_PALETTE.length];
};

const ROLE_PRIORITY: Record<Role, number> = {
  [Role.INSTRUCTOR]: 4,
  [Role.VOLUNTEER]: 3,
  [Role.MEMBER]: 2,
  [Role.GUEST]: 1,
  [Role.UNASSIGNED]: 0,
};

export const classifyOption = (
  optionText: string,
  rules: KeywordRule[] = DEFAULT_KEYWORD_RULES
): PollOptionClassification => {
  const normalized = optionText.trim().toLowerCase();
  if (!normalized) return { intent: 'UNVOTED' };

  const sortedRules = [...rules].sort((a, b) => b.keyword.length - a.keyword.length);
  const declining = sortedRules.find(
    (r) => r.intent === 'DECLINING' && normalized.includes(r.keyword.trim().toLowerCase())
  );
  if (declining) return { intent: 'DECLINING' };

  const maybe = sortedRules.find(
    (r) => r.intent === 'MAYBE' && normalized.includes(r.keyword.trim().toLowerCase())
  );
  if (maybe) return { intent: 'MAYBE' };

  const matchedAttending = sortedRules.filter(
    (r) => r.intent === 'ATTENDING' && normalized.includes(r.keyword.trim().toLowerCase())
  );
  if (matchedAttending.length === 0) return { intent: 'MAYBE' };

  let detectedRole: Role | undefined;
  let detectedIsSkipper = false;
  const tagSet = new Set<string>();

  matchedAttending.forEach((rule) => {
    if (rule.role && (!detectedRole || ROLE_PRIORITY[rule.role] > ROLE_PRIORITY[detectedRole])) {
      detectedRole = rule.role;
    }
    if (rule.isSkipper) detectedIsSkipper = true;
    (rule.grantedTags || []).forEach((t) => tagSet.add(t));
  });

  return {
    intent: 'ATTENDING',
    detectedRole,
    detectedIsSkipper: detectedIsSkipper || undefined,
    detectedTags: tagSet.size > 0 ? Array.from(tagSet) : undefined,
  };
};

export const classifySelectedOptions = (
  selectedOptions: string[],
  rules: KeywordRule[]
): PollOptionClassification => {
  if (!selectedOptions || selectedOptions.length === 0) return { intent: 'UNVOTED' };
  const results = selectedOptions.map((opt) => classifyOption(opt, rules));
  const attendingList = results.filter((r) => r.intent === 'ATTENDING');
  if (attendingList.length === 0) {
    return results.find((r) => r.intent === 'MAYBE') || results[0];
  }

  let detectedRole: Role | undefined;
  let detectedIsSkipper = false;
  const tagSet = new Set<string>();
  attendingList.forEach((res) => {
    if (res.detectedRole && (!detectedRole || ROLE_PRIORITY[res.detectedRole] > ROLE_PRIORITY[detectedRole])) {
      detectedRole = res.detectedRole;
    }
    if (res.detectedIsSkipper) detectedIsSkipper = true;
    (res.detectedTags || []).forEach((t) => tagSet.add(t));
  });

  return {
    intent: 'ATTENDING',
    detectedRole,
    detectedIsSkipper: detectedIsSkipper || undefined,
    detectedTags: tagSet.size > 0 ? Array.from(tagSet) : undefined,
  };
};

export const extractOptionLabels = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (typeof item === 'object' && item !== null) {
        const obj = item as { name?: unknown; title?: unknown; optionName?: unknown; label?: unknown };
        const candidate = obj.name ?? obj.title ?? obj.optionName ?? obj.label;
        return typeof candidate === 'string' ? candidate.trim() : '';
      }
      return String(item || '').trim();
    })
    .filter(Boolean);
};

export const formatFirestoreErrorMessage = (raw: string): string => {
  try {
    const parsed = JSON.parse(raw) as { error?: string; path?: string };
    if (parsed?.error) return parsed.path ? `${parsed.path}: ${parsed.error}` : parsed.error;
  } catch {
    // plain string
  }
  return raw;
};
