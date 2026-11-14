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
  if (digits.startsWith('972') && digits.length >= 11) {
    return '0' + digits.slice(3);
  }
  if (digits.length === 9 && digits.startsWith('5')) {
    return '0' + digits;
  }
  return digits;
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
  for (let i = 0; i < pollId.length; i++) {
    hash = (hash * 31 + pollId.charCodeAt(i)) >>> 0;
  }
  return POLL_COLOR_PALETTE[hash % POLL_COLOR_PALETTE.length];
};

export const classifyOption = (
  optionText: string,
  rules: KeywordRule[] = DEFAULT_KEYWORD_RULES
): PollOptionClassification => {
  const normalized = optionText.trim().toLowerCase();
  if (!normalized) return { intent: 'UNVOTED' };

  const sortedRules = [...rules].sort((a, b) => b.keyword.length - a.keyword.length);
  const decliningMatch = sortedRules.find(
    (r) => r.intent === 'DECLINING' && normalized.includes(r.keyword.trim().toLowerCase())
  );
  if (decliningMatch) return { intent: 'DECLINING' };

  const maybeMatch = sortedRules.find(
    (r) => r.intent === 'MAYBE' && normalized.includes(r.keyword.trim().toLowerCase())
  );
  if (maybeMatch) return { intent: 'MAYBE' };

  const roleAttending = sortedRules.find(
    (r) => r.intent === 'ATTENDING' && r.role && normalized.includes(r.keyword.trim().toLowerCase())
  );
  if (roleAttending) return { intent: 'ATTENDING', detectedRole: roleAttending.role };

  const genericAttending = sortedRules.find(
    (r) => r.intent === 'ATTENDING' && normalized.includes(r.keyword.trim().toLowerCase())
  );
  if (genericAttending) return { intent: 'ATTENDING' };

  return { intent: 'MAYBE' };
};

export const classifySelectedOptions = (
  selectedOptions: string[],
  rules: KeywordRule[]
): PollOptionClassification => {
  if (!selectedOptions || selectedOptions.length === 0) return { intent: 'UNVOTED' };
  const results = selectedOptions.map((opt) => classifyOption(opt, rules));
  return results.find((r) => r.intent === 'ATTENDING') || results.find((r) => r.intent === 'MAYBE') || results[0];
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
    if (parsed?.error) {
      return parsed.path ? `${parsed.path}: ${parsed.error}` : parsed.error;
    }
  } catch {
    // plain string
  }
  return raw;
};

