const PLACEHOLDER_NAMES = new Set(['משתמש ללא פרופיל', 'ללא שם', 'unknown', 'null', 'undefined']);
const RAW_JID_SUFFIX = /@(g\.us|c\.us|lid|s\.whatsapp\.net|broadcast|newsletter)$/i;

export const normalizePhone = (phone?: string): string => {
  if (!phone) return '';
  const base = phone.split('@')[0].split(':')[0];
  const digits = base.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00972') && digits.length >= 13) {
    const rest = digits.slice(5);
    return rest.startsWith('0') ? rest : `0${rest}`;
  }
  if (digits.startsWith('9720') && digits.length >= 12) return digits.slice(3);
  if (digits.startsWith('972') && digits.length >= 11) return `0${digits.slice(3)}`;
  if (digits.length === 9 && digits.startsWith('5')) return `0${digits}`;
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
  if (!voterId) return undefined;
  const raw = voterId.split('@')[0].split(':')[0].replace(/\D/g, '');
  if (!raw) return undefined;
  if (voterId.endsWith('@lid')) {
    // Real WhatsApp LIDs are opaque IDs, not MSISDNs; only accept exact 12-digit Israeli mobile prefix
    return /^9725\d{8}$/.test(raw) ? normalizePhone(raw) : undefined;
  }
  const normalized = normalizePhone(raw);
  return normalized.length >= 9 && normalized.length <= 13 ? normalized : undefined;
};

export const isNumericOnlyLabel = (value?: string): boolean => {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_NAMES.has(trimmed.toLowerCase()) || RAW_JID_SUFFIX.test(trimmed)) return true;
  return /^[\d+\s():-]+$/.test(trimmed);
};

export const pickPreferredDisplayName = (candidates: (string | undefined)[]): string | undefined => {
  const cleaned = candidates
    .map((c) => c?.trim() || '')
    .filter((c) => Boolean(c) && !PLACEHOLDER_NAMES.has(c.toLowerCase()));
  const realName = cleaned.find((c) => !isNumericOnlyLabel(c));
  if (realName) return realName;
  const numeric = cleaned[0];
  if (!numeric) return undefined;
  const norm = normalizePhone(numeric);
  return norm.length >= 9 ? norm : numeric;
};

export const cleanWhatsAppPhone = (phone?: string, voterId?: string): string | undefined => {
  if (phone) {
    const rawPart = phone.split('@')[0].split(':')[0];
    const digits = rawPart.replace(/\D/g, '');
    const lidUser = voterId?.endsWith('@lid') ? voterId.split('@')[0].split(':')[0] : '';
    const isLidDigits = Boolean(lidUser && digits === lidUser && !/^9725\d{8}$/.test(digits));
    if (digits && !isLidDigits && digits.length >= 9 && digits.length <= 14) {
      const normalized = normalizePhone(digits);
      if (normalized.length >= 9 && normalized.length <= 13) return normalized;
    }
  }
  return voterId ? extractPhoneFromVoterId(voterId) : undefined;
};

export const formatVoterPhoneDisplay = (phone?: string, voterId?: string): string => {
  const clean = cleanWhatsAppPhone(phone, voterId);
  if (clean) return clean;
  const fallback = (phone || voterId?.split('@')[0].split(':')[0] || '').trim();
  const normalized = normalizePhone(fallback);
  return /^05\d{8}$/.test(normalized) ? normalized : fallback;
};

export const sanitizeDocId = (rawId: string): string =>
  rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
