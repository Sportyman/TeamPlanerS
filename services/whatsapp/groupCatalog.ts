import { ClubWhatsAppConfig, PollEvent, WhatsAppMemberMapping } from '../../types/whatsapp';
import { isRawWhatsAppJid } from './clubDedupSync';

export interface WhatsAppGroupEntry {
  key: string;
  id?: string;
  name: string;
  knownAliases: string[];
}

export interface LinkedGroupDisplayItem {
  key: string;
  id?: string;
  name: string;
  knownAliases: string[];
}

export const isGroupJid = (value?: string): boolean => Boolean(value && /@g\.us$/i.test(value.trim()));
const norm = (value: string): string => value.trim().toLowerCase();

export const buildWhatsAppGroupCatalog = (
  polls: PollEvent[],
  mappings: WhatsAppMemberMapping[],
  config?: ClubWhatsAppConfig
): WhatsAppGroupEntry[] => {
  const byId = new Map<string, { name?: string; aliases: Set<string> }>();
  const nameToId = new Map<string, string>();
  const orphanNames = new Set<string>();

  const ensureId = (gid: string) => {
    let entry = byId.get(gid);
    if (!entry) {
      entry = { aliases: new Set<string>() };
      byId.set(gid, entry);
    }
    return entry;
  };

  polls.forEach((p) => {
    const cleanName = p.group && !isRawWhatsAppJid(p.group) ? p.group.trim() : '';
    if (p.groupId && isGroupJid(p.groupId)) {
      const entry = ensureId(p.groupId);
      if (cleanName) {
        if (!entry.name) entry.name = cleanName;
        entry.aliases.add(cleanName);
        if (!nameToId.has(norm(cleanName))) nameToId.set(norm(cleanName), p.groupId);
      }
    } else if (cleanName) {
      orphanNames.add(cleanName);
    }
  });

  mappings.forEach((m) => {
    const rawGroups = (m.groups || []).map((g) => g.trim()).filter(Boolean);
    const jids = rawGroups.filter(isGroupJid);
    const names = rawGroups.filter((g) => !isRawWhatsAppJid(g));
    jids.forEach((gid) => {
      const entry = ensureId(gid);
      if (jids.length === 1 && names.length >= 1) {
        const latestName = names[names.length - 1];
        if (!entry.name) entry.name = latestName;
        names.forEach((n) => {
          entry.aliases.add(n);
          if (!nameToId.has(norm(n))) nameToId.set(norm(n), gid);
        });
      }
    });
    names.forEach((n) => orphanNames.add(n));
  });

  Object.entries(config?.linkedGroupMeta || {}).forEach(([gid, savedName]) => {
    if (!isGroupJid(gid)) return;
    const entry = ensureId(gid);
    if (!entry.name && savedName && !isRawWhatsAppJid(savedName)) entry.name = savedName.trim();
    if (savedName && !isRawWhatsAppJid(savedName)) entry.aliases.add(savedName.trim());
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

export const resolveLinkedGroupItems = (config: ClubWhatsAppConfig, catalog: WhatsAppGroupEntry[]): LinkedGroupDisplayItem[] => {
  const result: LinkedGroupDisplayItem[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  (config.linkedGroupIds || []).forEach((gid) => {
    if (!isGroupJid(gid) || seenIds.has(gid)) return;
    seenIds.add(gid);
    const match = catalog.find((e) => e.id === gid);
    const displayName = match?.name || config.linkedGroupMeta?.[gid] || 'קבוצת וואטסאפ מקושרת';
    seenNames.add(norm(displayName));
    match?.knownAliases.forEach((a) => seenNames.add(norm(a)));
    result.push({ key: gid, id: gid, name: displayName, knownAliases: match?.knownAliases || [displayName] });
  });

  (config.linkedGroups || []).forEach((rawName) => {
    const n = norm(rawName);
    if (!n || seenNames.has(n)) return;
    const match = catalog.find((e) => norm(e.name) === n || e.knownAliases.some((a) => norm(a) === n));
    if (match?.id && seenIds.has(match.id)) return;
    if (match?.id) seenIds.add(match.id);
    const displayName = match?.name || rawName.trim();
    seenNames.add(norm(displayName));
    result.push({ key: match?.id || rawName.trim(), id: match?.id, name: displayName, knownAliases: match?.knownAliases || [displayName] });
  });

  return result;
};

export const doesPollMatchConfig = (poll: PollEvent, config: ClubWhatsAppConfig, effectiveIds: string[]): boolean => {
  if (poll.groupId && effectiveIds.includes(poll.groupId)) return true;
  if (!config.linkedGroups.length) return false;
  return config.linkedGroups.some((g) => poll.group.toLowerCase().includes(norm(g)));
};

export const buildLinkGroupConfigPatch = (
  config: ClubWhatsAppConfig,
  input: string,
  catalog: WhatsAppGroupEntry[]
): { nextConfig: ClubWhatsAppConfig; displayName: string } => {
  const trimmed = input.trim();
  const match = catalog.find((e) => e.key === trimmed || e.id === trimmed || norm(e.name) === norm(trimmed));
  const displayName = match?.name || trimmed;
  const nextIds = Array.from(new Set([...(config.linkedGroupIds || []), ...(match?.id ? [match.id] : [])]));
  const nextMeta = { ...(config.linkedGroupMeta || {}) };
  if (match?.id) nextMeta[match.id] = displayName;
  const aliasSet = new Set((match?.knownAliases || []).map(norm));
  const nextGroups = Array.from(new Set([...config.linkedGroups.filter((g) => !aliasSet.has(norm(g))), displayName]));
  return {
    displayName,
    nextConfig: { ...config, linkedGroups: nextGroups, linkedGroupIds: nextIds, linkedGroupMeta: nextMeta },
  };
};

export const buildUnlinkGroupConfigPatch = (
  config: ClubWhatsAppConfig,
  keyOrName: string,
  catalog: WhatsAppGroupEntry[]
): ClubWhatsAppConfig => {
  const trimmed = keyOrName.trim();
  const match = catalog.find((e) => e.key === trimmed || e.id === trimmed || norm(e.name) === norm(trimmed));
  const removeId = match?.id || (isGroupJid(trimmed) ? trimmed : undefined);
  const removeNames = new Set([norm(trimmed), ...(match ? [norm(match.name), ...match.knownAliases.map(norm)] : [])]);
  const nextIds = (config.linkedGroupIds || []).filter((id) => id !== removeId);
  const nextMeta = { ...(config.linkedGroupMeta || {}) };
  if (removeId) delete nextMeta[removeId];
  const nextGroups = config.linkedGroups.filter((g) => !removeNames.has(norm(g)));
  return { ...config, linkedGroups: nextGroups, linkedGroupIds: nextIds, linkedGroupMeta: nextMeta };
};

export const computeGroupConfigSyncPatch = (
  config: ClubWhatsAppConfig,
  catalog: WhatsAppGroupEntry[]
): ClubWhatsAppConfig | null => {
  const effectiveIds = getEffectiveLinkedIds(config, catalog);
  if (effectiveIds.length === 0) return null;
  const currentIds = config.linkedGroupIds || [];
  const nextMeta = { ...(config.linkedGroupMeta || {}) };
  let changed = effectiveIds.some((id) => !currentIds.includes(id));

  const items = resolveLinkedGroupItems({ ...config, linkedGroupIds: effectiveIds }, catalog);
  effectiveIds.forEach((gid) => {
    const match = catalog.find((e) => e.id === gid);
    if (match?.name && nextMeta[gid] !== match.name) {
      nextMeta[gid] = match.name;
      changed = true;
    }
  });
  if (!changed) return null;
  return { ...config, linkedGroupIds: effectiveIds, linkedGroupMeta: nextMeta, linkedGroups: items.map((i) => i.name) };
};
