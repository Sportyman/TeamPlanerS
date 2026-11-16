import { ClubWhatsAppConfig, PollEvent } from '../../types/whatsapp';
import { getEffectiveLinkedIds, isGroupJid, WhatsAppGroupEntry } from './groupCatalog';

export interface LinkedGroupDisplayItem {
  key: string;
  id?: string;
  name: string;
  knownAliases: string[];
}

const norm = (value: string): string => value.trim().toLowerCase();

export const resolveLinkedGroupItems = (
  config: ClubWhatsAppConfig,
  catalog: WhatsAppGroupEntry[]
): LinkedGroupDisplayItem[] => {
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

export const doesPollMatchConfig = (
  poll: PollEvent,
  config: ClubWhatsAppConfig,
  effectiveIds: string[],
  catalog: WhatsAppGroupEntry[] = []
): boolean => {
  if (poll.groupId && effectiveIds.includes(poll.groupId)) return true;
  const pollNameNorm = norm(poll.group);
  if (effectiveIds.length > 0 && pollNameNorm) {
    const matchedEntry = catalog.find(
      (e) => e.id && effectiveIds.includes(e.id) && (norm(e.name) === pollNameNorm || e.knownAliases.some((a) => norm(a) === pollNameNorm))
    );
    if (matchedEntry) return true;
  }
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
  return { displayName, nextConfig: { ...config, linkedGroups: nextGroups, linkedGroupIds: nextIds, linkedGroupMeta: nextMeta } };
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
