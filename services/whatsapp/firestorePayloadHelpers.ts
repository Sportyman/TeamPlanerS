import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { toTimestampMs } from './pollFormatting';

const BIDI_REGEX = /[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const RAW_JID_REGEX = /@(g\.us|c\.us|lid|broadcast|newsletter)$/i;
const GROUP_JID_REGEX = /@g\.us$/i;

export const cleanUnicodeBidi = (value: string): string =>
  value.replace(BIDI_REGEX, '').replace(/\s+/g, ' ').trim();

export const normalizeGroupKey = (value: string): string =>
  cleanUnicodeBidi(value).toLowerCase();

export const isServerTimestampSentinel = (val: unknown): boolean =>
  typeof val === 'object' &&
  val !== null &&
  (val as Record<string, unknown>)._methodName === 'serverTimestamp';

export const extractGroupTags = (raw: unknown): string[] | undefined => {
  if (Array.isArray(raw)) {
    const cleaned = raw.map((item) => cleanUnicodeBidi(String(item || ''))).filter(Boolean);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as { _elements?: unknown };
    if (Array.isArray(obj._elements)) {
      const cleaned = obj._elements.map((item) => cleanUnicodeBidi(String(item || ''))).filter(Boolean);
      return cleaned.length > 0 ? cleaned : undefined;
    }
  }
  if (typeof raw === 'string' && raw.trim()) {
    return [cleanUnicodeBidi(raw)];
  }
  return undefined;
};

const extractGroupJid = (val: unknown): string | undefined => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return GROUP_JID_REGEX.test(trimmed) ? trimmed : undefined;
  }
  if (val && typeof val === 'object') {
    const obj = val as { id?: unknown; _serialized?: unknown };
    return extractGroupJid(obj._serialized) || extractGroupJid(obj.id);
  }
  return undefined;
};

export const resolvePollGroupInfo = (
  data: Record<string, unknown>
): { groupId?: string; group: string } => {
  const rawGroupObj = data.group && typeof data.group === 'object' ? (data.group as Record<string, unknown>) : null;
  const rawGroupStr = typeof data.group === 'string' ? cleanUnicodeBidi(data.group) : '';
  const rawGroupName = typeof data.groupName === 'string'
    ? cleanUnicodeBidi(data.groupName)
    : typeof rawGroupObj?.name === 'string'
    ? cleanUnicodeBidi(rawGroupObj.name)
    : '';

  const groupId =
    extractGroupJid(data.groupId) ||
    extractGroupJid(data.group) ||
    extractGroupJid(data.chatId) ||
    extractGroupJid(data.to);

  const nonJidGroupStr = rawGroupStr && !RAW_JID_REGEX.test(rawGroupStr) ? rawGroupStr : '';
  const group = rawGroupName || nonJidGroupStr || 'קבוצה כללית';
  return { groupId, group };
};

export const extractPollCreatedAtInfo = (
  data: Record<string, unknown>,
  fallbackMs?: number
): { createdAtMs: number; hasPendingTimestamp: boolean } => {
  const directMs =
    toTimestampMs(data.createdAtMs) ||
    toTimestampMs(data.createdAt) ||
    toTimestampMs(data.timestamp) ||
    toTimestampMs(data.created_at) ||
    toTimestampMs(data.updatedAt) ||
    toTimestampMs(data.sentAt) ||
    toTimestampMs(data.ts);

  const hasSentinel =
    isServerTimestampSentinel(data.createdAt) ||
    isServerTimestampSentinel(data.createdAtMs) ||
    isServerTimestampSentinel(data.timestamp);

  if (directMs > 0) return { createdAtMs: directMs, hasPendingTimestamp: false };
  if (fallbackMs && fallbackMs > 0) return { createdAtMs: fallbackMs, hasPendingTimestamp: hasSentinel };
  return { createdAtMs: 0, hasPendingTimestamp: hasSentinel };
};

export const fetchLatestVoteTimestampMap = async (
  pollIds: string[]
): Promise<Map<string, number>> => {
  const result = new Map<string, number>();
  const uniqueIds = Array.from(new Set(pollIds.filter(Boolean)));
  for (let i = 0; i < uniqueIds.length; i += 10) {
    const chunk = uniqueIds.slice(i, i + 10);
    try {
      const snap = await getDocs(query(collection(db, 'poll_votes'), where('pollId', 'in', chunk)));
      snap.docs.forEach((d) => {
        const vData = d.data();
        const pid = String(vData.pollId || '');
        if (!pid) return;
        const ts = toTimestampMs(vData.interractedAt) || toTimestampMs(vData.timestamp);
        if (ts > (result.get(pid) || 0)) result.set(pid, ts);
      });
    } catch {
      // Non-critical fallback lookup
    }
  }
  return result;
};

const pickStr = (...vals: unknown[]): string | undefined => {
  for (const v of vals) {
    if (typeof v === 'string') {
      const cleaned = cleanUnicodeBidi(v);
      if (cleaned) return cleaned;
    }
  }
  return undefined;
};

const pickNameStr = (...vals: unknown[]): string | undefined => {
  const numericFound: string[] = [];
  for (const v of vals) {
    if (typeof v !== 'string') continue;
    const cleaned = cleanUnicodeBidi(v);
    if (!cleaned || RAW_JID_REGEX.test(cleaned)) continue;
    if (/^[\d+\s():-]+$/.test(cleaned)) numericFound.push(cleaned);
    else return cleaned;
  }
  return numericFound[0];
};

export const extractWhatsAppContactFields = (data: Record<string, unknown>) => {
  const nested = (data.contact || data.voterInfo || data.author || data.sender || data.profile || data.participant || data.user) as Record<string, unknown> | undefined;
  const fullNameFromParts = pickStr(data.firstName, nested?.firstName) && pickStr(data.lastName, nested?.lastName)
    ? `${pickStr(data.firstName, nested?.firstName)} ${pickStr(data.lastName, nested?.lastName)}`.trim()
    : undefined;
  const pushName = pickNameStr(
    data.pushName, data.pushname, data.voterName, data.displayName, data.notifyName, data.notify,
    data.verifiedName, data.verifiedBizName, data.formattedName, data.fullName, fullNameFromParts,
    data.shortName, data.name, data.senderName, data.authorName, data.contactName, data.voterPushName,
    nested?.pushName, nested?.pushname, nested?.displayName, nested?.formattedName,
    nested?.verifiedName, nested?.notifyName, nested?.notify, nested?.shortName, nested?.name
  );
  const profilePicUrl = pickStr(
    data.profilePicUrl, data.photoURL, data.photoUrl, data.picUrl,
    data.avatarUrl, data.profilePicture, data.profilePic, data.picture,
    data.avatar, nested?.profilePicUrl, nested?.photoUrl, nested?.photoURL
  );
  const phone = pickStr(
    data.phone, data.phoneNumber, data.pn, data.mobile, data.senderPhone,
    data.voterPhone, nested?.phone, nested?.phoneNumber, nested?.number
  );
  const rawAliases = [
    ...(Array.isArray(data.aliasVoterIds) ? data.aliasVoterIds : []),
    data.voterId, data.voter, data.lid, data.pnJid, data.jid, data.cUs, data.altVoterId,
  ]
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean);
  const aliasVoterIds = rawAliases.length > 0 ? Array.from(new Set(rawAliases)) : undefined;
  return { pushName, profilePicUrl, phone, aliasVoterIds };
};

