import { BoatDefinition, BoatInventory, DefaultBoatTypes, Person, Role, Team } from '../types';
import {
  buildClusters,
  groupSingleKayaksIntoPods,
  hasAffinityWithTeam,
  isClusterCompatible,
  PairingCluster,
  personRequiresDouble,
} from './pairingHelpers';

const newId = () => Math.random().toString(36).slice(2, 11);

export const generateSmartPairings = (
  people: Person[],
  inventory: BoatInventory,
  boatDefinitions: BoatDefinition[]
): Team[] => {
  if (!people?.length || !boatDefinitions?.length) return [];

  const multiTeams: Team[] = [];
  const singleTeams: Team[] = [];
  const currentInventory = { ...inventory };
  const sortedDefs = [...boatDefinitions].sort((a, b) =>
    b.capacity !== a.capacity ? b.capacity - a.capacity : a.isStable === b.isStable ? 0 : a.isStable ? 1 : -1
  );

  const useBoat = (boatId: string) => {
    if ((currentInventory[boatId] || 0) > 0) {
      currentInventory[boatId] -= 1;
      return true;
    }
    return false;
  };

  let allClusters = buildClusters(people);

  // 1. PRIVATE boats first (will join single buddy pods so nobody goes out alone)
  const privateDef = sortedDefs.find((b) => b.id === DefaultBoatTypes.PRIVATE);
  if (privateDef && (currentInventory[privateDef.id] || 0) > 0) {
    const remaining: PairingCluster[] = [];
    for (const c of allClusters) {
      if (c.requiresPrivate && useBoat(privateDef.id)) {
        singleTeams.push({ id: newId(), members: c.members, boatType: privateDef.id, boatCount: 1 });
      } else {
        remaining.push(c);
      }
    }
    allClusters = remaining;
  }

  const captainClusters = allClusters.filter((c) => c.hasVolunteer).sort((a, b) => b.totalRank - a.totalRank);
  const passengerClusters = allClusters.filter((c) => !c.hasVolunteer).sort((a, b) => {
    const aDouble = a.size > 1 || a.members.some(personRequiresDouble) ? 0 : 1;
    const bDouble = b.size > 1 || b.members.some(personRequiresDouble) ? 0 : 1;
    return aDouble !== bDouble ? aDouble - bDouble : a.totalRank - b.totalRank;
  });

  // 2. Multi-seat boats (DOUBLE = always prefer Volunteer + Member; fallback to highest-rank pairs)
  for (const boatDef of sortedDefs.filter((b) => b.capacity > 1)) {
    let availableCount = currentInventory[boatDef.id] || 0;
    const reqSkippers = boatDef.minSkippers || 0;

    while (availableCount > 0) {
      const teamMembers: Person[] = [];
      let remainingCap = boatDef.capacity;
      let skipperCount = 0;

      const pickCaptainIdx = (): number => {
        if (reqSkippers > 0) {
          const skipIdx = captainClusters.findIndex((c) => c.size <= remainingCap && c.skipperCount > 0 && !c.prefersSingle);
          if (skipIdx !== -1) return skipIdx;
          const skipAny = captainClusters.findIndex((c) => c.size <= remainingCap && c.skipperCount > 0);
          if (skipAny !== -1) return skipAny;
        }
        const nonSingle = captainClusters.findIndex((c) => c.size <= remainingCap && !c.prefersSingle);
        if (nonSingle !== -1) return nonSingle;
        return passengerClusters.length > 0 ? captainClusters.findIndex((c) => c.size <= remainingCap) : -1;
      };

      const capIdx = pickCaptainIdx();
      if (capIdx !== -1) {
        const cap = captainClusters.splice(capIdx, 1)[0];
        teamMembers.push(...cap.members);
        remainingCap -= cap.size;
        skipperCount += cap.skipperCount;
      } else if (passengerClusters.some((c) => c.size <= remainingCap)) {
        // Fallback: pick highest-rank member first if no volunteers remain
        const bestPassIdx = passengerClusters.reduce((best, c, idx, arr) =>
          c.size <= remainingCap && (best === -1 || c.totalRank > arr[best].totalRank) ? idx : best, -1);
        if (bestPassIdx === -1) break;
        const pass = passengerClusters.splice(bestPassIdx, 1)[0];
        teamMembers.push(...pass.members);
        remainingCap -= pass.size;
      } else {
        break;
      }

      while (remainingCap > 0) {
        let passIdx = passengerClusters.findIndex((c) => c.size <= remainingCap && isClusterCompatible(c, teamMembers) && hasAffinityWithTeam(c, teamMembers));
        if (passIdx === -1) passIdx = passengerClusters.findIndex((c) => c.size <= remainingCap && !c.prefersSingle && isClusterCompatible(c, teamMembers));
        if (passIdx === -1) passIdx = passengerClusters.findIndex((c) => c.size <= remainingCap && isClusterCompatible(c, teamMembers));

        if (passIdx !== -1) {
          const pass = passengerClusters.splice(passIdx, 1)[0];
          teamMembers.push(...pass.members);
          remainingCap -= pass.size;
          skipperCount += pass.skipperCount;
          continue;
        }

        const needSkip = reqSkippers > 0 && skipperCount < reqSkippers;
        let extraIdx = needSkip ? captainClusters.findIndex((c) => c.size <= remainingCap && c.skipperCount > 0 && isClusterCompatible(c, teamMembers)) : -1;
        if (extraIdx === -1) extraIdx = captainClusters.findIndex((c) => c.size <= remainingCap && !c.prefersSingle && isClusterCompatible(c, teamMembers));
        if (extraIdx === -1 && teamMembers.length === 1) extraIdx = captainClusters.findIndex((c) => c.size <= remainingCap && isClusterCompatible(c, teamMembers));
        if (extraIdx !== -1) {
          const extra = captainClusters.splice(extraIdx, 1)[0];
          teamMembers.push(...extra.members);
          remainingCap -= extra.size;
          skipperCount += extra.skipperCount;
          continue;
        }
        break;
      }

      const warnings: string[] = [];
      const hasVol = teamMembers.some((m) => m.role === Role.VOLUNTEER || m.role === Role.INSTRUCTOR);
      if (!hasVol) warnings.push('צוות ללא מתנדב');
      if (teamMembers.length === 1) warnings.push('חותר בודד בסירה זוגית');
      if (reqSkippers > 0 && skipperCount < reqSkippers) warnings.push('חסר סקיפר בסירה');

      multiTeams.push({ id: newId(), members: teamMembers, boatType: boatDef.id, boatCount: 1, warnings: warnings.length ? warnings : undefined });
      useBoat(boatDef.id);
      availableCount--;
    }
  }

  // 3. Single-seat boats grouped into safety buddy pairs/trios (never solo)
  const leftovers = [...captainClusters, ...passengerClusters];
  for (const boatDef of sortedDefs.filter((b) => b.capacity === 1 && b.id !== DefaultBoatTypes.PRIVATE)) {
    let availableCount = currentInventory[boatDef.id] || 0;
    while (availableCount > 0 && leftovers.length > 0) {
      let idx = leftovers.findIndex((c) => c.size === 1 && c.prefersSingle);
      if (idx === -1) idx = leftovers.findIndex((c) => c.size === 1 && (boatDef.isStable || !personRequiresDouble(c.members[0])));
      if (idx === -1) break;

      const cluster = leftovers.splice(idx, 1)[0];
      const warnings: string[] = [];
      if (cluster.totalRank <= 2 && !cluster.hasVolunteer && !boatDef.isStable) warnings.push('חותר מתחיל בקיאק יחיד');
      singleTeams.push({ id: newId(), members: cluster.members, boatType: boatDef.id, boatCount: 1, warnings: warnings.length ? warnings : undefined });
      useBoat(boatDef.id);
      availableCount--;
    }
  }

  const groupedSingles = groupSingleKayaksIntoPods(singleTeams);
  const unassigned: Team[] = leftovers.flatMap((cluster) =>
    cluster.members.map((p) => ({
      id: newId(), members: [p], boatType: 'UNKNOWN', boatCount: 0,
      warnings: [personRequiresDouble(p) ? 'נדרש קיאק זוגי (חסר כלי שיט זוגי / מתנדב)' : 'אין סירה פנויה (או התנגשות)'],
    }))
  );

  return [...multiTeams, ...groupedSingles, ...unassigned];
};
