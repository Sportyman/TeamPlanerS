import { DefaultBoatTypes, Person, Role, Team } from '../types';

export interface PairingCluster {
  id: string;
  members: Person[];
  hasVolunteer: boolean;
  skipperCount: number;
  totalRank: number;
  size: number;
  prefersSingle: boolean;
  requiresPrivate: boolean;
}

export const personRequiresPrivate = (p: Person): boolean =>
  p.preferredBoatType === DefaultBoatTypes.PRIVATE;

export const personPrefersSingle = (p: Person): boolean =>
  p.preferredBoatType === DefaultBoatTypes.SINGLE ||
  (p.tags || []).some((t) => t.includes('חותר עצמאי'));

export const personRequiresDouble = (p: Person): boolean => {
  if (personRequiresPrivate(p)) return false;
  if (p.preferredBoatType === DefaultBoatTypes.DOUBLE) return true;
  if (personPrefersSingle(p)) return false;
  return p.role === Role.MEMBER || p.role === Role.GUEST;
};

export const buildClusters = (people: Person[]): PairingCluster[] => {
  const available = [...people];
  const clusters: PairingCluster[] = [];

  while (available.length > 0) {
    const root = available.shift()!;
    const members = [root];
    let changed = true;
    while (changed) {
      changed = false;
      for (const member of [...members]) {
        for (const tid of member.mustPairWith || []) {
          const idx = available.findIndex((p) => p.id === tid);
          if (idx !== -1) { members.push(available.splice(idx, 1)[0]); changed = true; }
        }
      }
      for (let i = 0; i < available.length; i++) {
        if ((available[i].mustPairWith || []).some((tid) => members.some((m) => m.id === tid))) {
          members.push(available.splice(i, 1)[0]);
          i--;
          changed = true;
        }
      }
    }
    clusters.push({
      id: `cluster-${root.id}`,
      members,
      hasVolunteer: members.some((m) => m.role === Role.VOLUNTEER || m.role === Role.INSTRUCTOR),
      skipperCount: members.filter((m) => m.isSkipper).length,
      totalRank: members.reduce((sum, m) => sum + (m.rank || 0), 0),
      size: members.length,
      prefersSingle: members.length === 1 && personPrefersSingle(members[0]),
      requiresPrivate: members.length === 1 && personRequiresPrivate(members[0]),
    });
  }
  return clusters;
};

export const isClusterCompatible = (cluster: PairingCluster, currentMembers: Person[]): boolean => {
  for (const newPerson of cluster.members) {
    for (const existing of currentMembers) {
      if (newPerson.cannotPairWith?.includes(existing.id)) return false;
      if (existing.cannotPairWith?.includes(newPerson.id)) return false;
      if (newPerson.genderConstraint?.type !== 'NONE' && newPerson.genderConstraint?.strength === 'MUST') {
        if (newPerson.genderConstraint.type === 'MALE' && existing.gender !== 'MALE') return false;
        if (newPerson.genderConstraint.type === 'FEMALE' && existing.gender !== 'FEMALE') return false;
      }
      if (existing.genderConstraint?.type !== 'NONE' && existing.genderConstraint?.strength === 'MUST') {
        if (existing.genderConstraint.type === 'MALE' && newPerson.gender !== 'MALE') return false;
        if (existing.genderConstraint.type === 'FEMALE' && newPerson.gender !== 'FEMALE') return false;
      }
    }
  }
  return true;
};

export const hasAffinityWithTeam = (cluster: PairingCluster, teamMembers: Person[]): boolean =>
  cluster.members.some((m) => m.preferPairWith?.some((pid) => teamMembers.some((tm) => tm.id === pid))) ||
  teamMembers.some((tm) => tm.preferPairWith?.some((pid) => cluster.members.some((cm) => cm.id === pid)));

export const groupSingleKayaksIntoPods = (singleTeams: Team[]): Team[] => {
  if (singleTeams.length === 0) return [];
  if (singleTeams.length === 1) {
    const solo = singleTeams[0];
    return [{
      ...solo,
      buddyGroup: 'קיאק יחיד בודד',
      warnings: [...(solo.warnings || []), 'אסור לצאת לבד — חובה לצרף לזוג או שלישייה'],
    }];
  }

  const vols = singleTeams.filter((t) => t.members[0]?.role === Role.VOLUNTEER || t.members[0]?.role === Role.INSTRUCTOR)
    .sort((a, b) => (b.members[0]?.rank || 0) - (a.members[0]?.rank || 0));
  const mems = singleTeams.filter((t) => t.members[0]?.role === Role.MEMBER || t.members[0]?.role === Role.GUEST)
    .sort((a, b) => (a.members[0]?.rank || 0) - (b.members[0]?.rank || 0));

  const pods: { label: string; items: Team[]; warn?: string }[] = [];
  while (vols.length > 0 && mems.length > 0) {
    pods.push({ label: 'מתנדב + חבר', items: [vols.shift()!, mems.shift()!] });
  }
  // Remaining members: pair high rank with high/medium rank
  const highMems = mems.sort((a, b) => (b.members[0]?.rank || 0) - (a.members[0]?.rank || 0));
  while (highMems.length >= 2) {
    const a = highMems.shift()!;
    const b = highMems.shift()!;
    const lowPair = (a.members[0]?.rank || 0) <= 2 && (b.members[0]?.rank || 0) <= 2;
    pods.push({
      label: lowPair ? 'זוג חברים' : 'זוג בדירוג מתקדם/ממוצע',
      items: [a, b],
      warn: lowPair ? 'זוג יחידים בדירוג נמוך ללא מתנדב' : undefined,
    });
  }
  while (vols.length >= 2) {
    pods.push({ label: 'זוג מתנדבים', items: [vols.shift()!, vols.shift()!] });
  }

  const oddLeftover = highMems[0] || vols[0];
  if (oddLeftover && pods.length > 0) {
    pods[pods.length - 1].items.push(oddLeftover);
    pods[pods.length - 1].label = 'שלישיית יחידים';
  }

  const ordered: Team[] = [];
  pods.forEach((pod, idx) => {
    const kind = pod.items.length === 3 ? 'שלישייה' : 'זוג';
    const groupText = `קבוצת חתירה ${idx + 1} (${kind} · ${pod.label})`;
    pod.items.forEach((team) => {
      const warnings = [...(team.warnings || []), ...(pod.warn ? [pod.warn] : [])];
      ordered.push({ ...team, buddyGroup: groupText, warnings: warnings.length ? warnings : undefined });
    });
  });
  return ordered;
};
