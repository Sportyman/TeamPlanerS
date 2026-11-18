import { ClubWhatsAppConfig, PollEvent, WhatsAppMemberMapping } from '../../types/whatsapp';
import { isRawWhatsAppJid } from './clubDedupSync';
import { cleanUnicodeBidi, normalizeGroupKey } from './firestorePayloadHelpers';

export interface WhatsAppGroupEntry {
  key: string;
  id?: string;
  name: string;
  knownAliases: string[];
}

export const isGroupJid = (value?: string): boolean => Boolean(value && /@g\.us$/i.test(value.trim()));
const norm = (value: string): string => normalizeGroupKey(value);

export const buildWhatsAppGroupCatalog = (
  polls: PollEvent[],
  mappings: WhatsAppMemberMapping[],
  config?: ClubWhatsAppConfig
): WhatsAppGroupEntry[] => {
  const byId = new Map<string, { name?: string; nameTs: number; aliases: Set<string>; aliasDisplay: Map<string, string> }>();
  const nameToId = new Map<string, string>();
  const latestPollByName = new Map<string, { raw: string; ts: number }>();
  const orphanNames = new Set<string>();

  const ensureId = (gid: string) => {
    let entry = byId.get(gid);
    if (!entry) {
      entry = { nameTs: -1, aliases: new Set<string>(), aliasDisplay: new Map<string, string>() };
      byId.set(gid, entry);
    }
    return entry;
  };

  polls.forEach((p) => {
    const cleanName = p.group && !isRawWhatsAppJid(p.group) ? cleanUnicodeBidi(p.group) : '';
    const ts = p.createdAtMs || 0;
    if (cleanName) {
      const prev = latestPollByName.get(norm(cleanName));
      if (!prev || ts >= prev.ts) latestPollByName.set(norm(cleanName), { raw: cleanName, ts });
    }
    if (p.groupId && isGroupJid(p.groupId)) {
      const entry = ensureId(p.groupId);
      if (cleanName) {
        entry.aliases.add(cleanName);
        entry.aliasDisplay.set(norm(cleanName), cleanName);
        if (!nameToId.has(norm(cleanName))) nameToId.set(norm(cleanName), p.groupId);
        if (!entry.name || ts > entry.nameTs) {
          entry.name = cleanName;
          entry.nameTs = ts;
        }
      }
    } else if (cleanName) {
      orphanNames.add(cleanName);
    }
  });

  mappings.forEach((m) => {
    const rawGroups = (m.groups || []).map((g) => cleanUnicodeBidi(g)).filter(Boolean);
    const jids = rawGroups.filter(isGroupJid);
    const names = rawGroups.filter((g) => !isRawWhatsAppJid(g));
    const updatedMs = m.updatedAt ? Date.parse(m.updatedAt) || 0 : 0;
    jids.forEach((gid) => {
      const entry = ensureId(gid);
      if (jids.length === 1 && names.length >= 1) {
        const latestMemberName = names[names.length - 1];
        names.forEach((n) => {
          entry.aliases.add(n);
          entry.aliasDisplay.set(norm(n), n);
          if (!nameToId.has(norm(n))) nameToId.set(norm(n), gid);
        });
        if (!entry.name || updatedMs > entry.nameTs) {
          entry.name = latestMemberName;
          entry.nameTs = updatedMs;
        }
      }
    });
    names.forEach((n) => orphanNames.add(n));
  });

  byId.forEach((entry) => {
    entry.aliases.forEach((alias) => {
      const pollInfo = latestPollByName.get(norm(alias));
      if (pollInfo && pollInfo.ts > entry.nameTs) {
        entry.name = pollInfo.raw;
        entry.nameTs = pollInfo.ts;
      }
    });
  });

  Object.entries(config?.linkedGroupMeta || {}).forEach(([gid, savedName]) => {
    if (!isGroupJid(gid)) return;
    const entry = ensureId(gid);
    if (savedName && !isRawWhatsAppJid(savedName)) {
      entry.aliases.add(savedName.trim());
      if (!entry.name) entry.name = savedName.trim();
    }
  });

  const entries: WhatsAppGroupEntry[] = [];
  byId.forEach((data, gid) => {
    if (data.name) entries.push({ key: gid, id: gid, name: data.name, knownAliases: Array.from(data.aliases) });
  });

  orphanNames.forEach((n) => {
    if (nameToId.has(norm(n))) return;
    const exists = entries.some((e) => norm(e.name) === norm(n) || e.knownAliases.some((a) => norm(a) === norm(n)));
    if (!exists) entries.push({ key: n, name: n, knownAliases: [n] });
  });

  return entries.sort((a, b) => a.name.localeCompare(b.name, 'he'));
};

export const getEffectiveLinkedIds = (config: ClubWhatsAppConfig, catalog: WhatsAppGroupEntry[]): string[] => {
  const ids = new Set<string>((config.linkedGroupIds || []).filter(isGroupJid));
  (config.linkedGroups || []).forEach((name) => {
    const match = catalog.find((e) => norm(e.name) === norm(name) || e.knownAliases.some((a) => norm(a) === norm(name)));
    if (match?.id) ids.add(match.id);
  });
  return Array.from(ids);
};

export type { LinkedGroupDisplayItem } from './groupConfigSync';
export {
  resolveLinkedGroupItems,
  doesPollMatchConfig,
  buildLinkGroupConfigPatch,
  buildUnlinkGroupConfigPatch,
  computeGroupConfigSyncPatch,
} from './groupConfigSync';
