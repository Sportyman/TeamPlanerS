
import { Person, Role, BoatInventory, Team, BoatDefinition, GenderPrefType } from '../types';

// --- Types for Internal Logic ---
interface Cluster {
  id: string;
  members: Person[];
  hasVolunteer: boolean;
  skipperCount: number; // New: track how many skippers in this cluster
  totalRank: number;
  roles: Role[];
  size: number;
}

interface BoatSlot {
    boatId: string;
    def: BoatDefinition;
    assignedClusterIds: string[];
    members: Person[];
    remainingCapacity: number;
    skipperCount: number;
    hasVolunteer: boolean;
}

/**
 * The "Smart Distribution" Pairing Algorithm
 * Strategy:
 * 1. Analyze Inventory & Clusters.
 * 2. "Anchor" Phase: Distribute Skippers/Volunteers across ALL boats first to ensure maximum viable fleet.
 * 3. "Fill" Phase: Fill remaining seats with passengers.
 */
export const generateSmartPairings = (
  people: Person[], 
  inventory: BoatInventory,
  boatDefinitions: BoatDefinition[]
): Team[] => {
  
  // --- STEP 1: PREPARE DATA ---
  
  // 1.1 Create Boat Slots based on Inventory
  // We expand the inventory numbers into individual workable slots
  let boatSlots: BoatSlot[] = [];
  
  // Sort Definitions: Boats that require skippers first, then by capacity desc
  const sortedBoatDefs = [...boatDefinitions].sort((a, b) => {
      const aReq = (a.minSkippers || 0) > 0 ? 1 : 0;
      const bReq = (b.minSkippers || 0) > 0 ? 1 : 0;
      if (aReq !== bReq) return bReq - aReq; // Skipper boats first
      return b.capacity - a.capacity; // Then big boats
  });

  sortedBoatDefs.forEach(def => {
      const count = inventory[def.id] || 0;
      for (let i = 0; i < count; i++) {
          boatSlots.push({
              boatId: Math.random().toString(36).substr(2, 9),
              def: def,
              assignedClusterIds: [],
              members: [],
              remainingCapacity: def.capacity,
              skipperCount: 0,
              hasVolunteer: false
          });
      }
  });

  // 1.2 Build Clusters (Grouping Logic)
  // If Person A must pair with Person B, they become a single unit.
  let availablePeople = [...people];
  const clusters: Cluster[] = [];

  while (availablePeople.length > 0) {
      const root = availablePeople[0];
      const clusterMembers = [root];
      availablePeople.shift(); 

      // Recursive find logic
      let changed = true;
      while (changed) {
          changed = false;
          // 1. Check requirements of current cluster members
          for (const member of clusterMembers) {
              if (member.mustPairWith) {
                  for (const targetId of member.mustPairWith) {
                      const targetIdx = availablePeople.findIndex(p => p.id === targetId);
                      if (targetIdx !== -1) {
                          clusterMembers.push(availablePeople[targetIdx]);
                          availablePeople.splice(targetIdx, 1);
                          changed = true;
                      }
                  }
              }
          }
          // 2. Check pool vs cluster
          for (let i = 0; i < availablePeople.length; i++) {
              const candidate = availablePeople[i];
              if (candidate.mustPairWith) {
                  const matchFound = candidate.mustPairWith.some(targetId => 
                      clusterMembers.some(m => m.id === targetId)
                  );
                  if (matchFound) {
                      clusterMembers.push(candidate);
                      availablePeople.splice(i, 1);
                      i--;
                      changed = true;
                  }
              }
          }
      }
      
      clusters.push({
          id: `cluster-${root.id}`,
          members: clusterMembers,
          hasVolunteer: clusterMembers.some(m => m.role === Role.VOLUNTEER || m.role === Role.INSTRUCTOR),
          skipperCount: clusterMembers.filter(m => m.isSkipper).length,
          totalRank: clusterMembers.reduce((sum, m) => sum + m.rank, 0),
          roles: clusterMembers.map(m => m.role),
          size: clusterMembers.length
      });
  }

  // 1.3 Segregate Clusters
  // Tier A: Has Skipper (Gold)
  const skipperClusters = clusters.filter(c => c.skipperCount > 0);
  // Tier B: Has Volunteer but no Skipper (Silver)
  const volunteerClusters = clusters.filter(c => c.hasVolunteer && c.skipperCount === 0);
  // Tier C: Passengers (Bronze)
  const passengerClusters = clusters.filter(c => !c.hasVolunteer);

  // Sort tiers by rank/size to optimize fitting
  const sortFn = (a: Cluster, b: Cluster) => b.totalRank - a.totalRank;
  skipperClusters.sort(sortFn);
  volunteerClusters.sort(sortFn);
  passengerClusters.sort((a,b) => a.totalRank - b.totalRank); // Low rank needs help first

  // Helper: Compatibility Check
  const isCompatible = (cluster: Cluster, slot: BoatSlot): boolean => {
      // Size check
      if (cluster.size > slot.remainingCapacity) return false;

      // Constraints check
      for (const newPerson of cluster.members) {
          for (const existingPerson of slot.members) {
              // Blacklist
              if (newPerson.cannotPairWith?.includes(existingPerson.id)) return false;
              if (existingPerson.cannotPairWith?.includes(newPerson.id)) return false;

              // Gender Strict
              if (newPerson.genderConstraint?.strength === 'MUST') {
                  if (newPerson.genderConstraint.type === 'MALE' && existingPerson.gender !== 'MALE') return false;
                  if (newPerson.genderConstraint.type === 'FEMALE' && existingPerson.gender !== 'FEMALE') return false;
              }
              if (existingPerson.genderConstraint?.strength === 'MUST') {
                  if (existingPerson.genderConstraint.type === 'MALE' && newPerson.gender !== 'MALE') return false;
                  if (existingPerson.genderConstraint.type === 'FEMALE' && newPerson.gender !== 'FEMALE') return false;
              }
          }
      }
      return true;
  };

  const assignClusterToSlot = (cluster: Cluster, slot: BoatSlot) => {
      slot.members.push(...cluster.members);
      slot.assignedClusterIds.push(cluster.id);
      slot.remainingCapacity -= cluster.size;
      slot.skipperCount += cluster.skipperCount;
      if (cluster.hasVolunteer) slot.hasVolunteer = true;
  };

  // --- STEP 2: ANCHOR DISTRIBUTION (The "Skipper Spread") ---
  // Goal: Ensure every boat that needs a skipper gets one BEFORE we double up.

  // 2.1 Assign Skippers to Skipper-Mandated Boats
  const skipperBoats = boatSlots.filter(b => (b.def.minSkippers || 0) > 0);
  
  for (const slot of skipperBoats) {
      if (skipperClusters.length === 0) break;
      
      // Find best fit skipper cluster
      // Preference check first
      let idx = skipperClusters.findIndex(c => 
          c.members[0].preferredBoatType === slot.def.id && isCompatible(c, slot)
      );
      
      if (idx === -1) {
          // Any skipper fit
          idx = skipperClusters.findIndex(c => isCompatible(c, slot));
      }

      if (idx !== -1) {
          assignClusterToSlot(skipperClusters[idx], slot);
          skipperClusters.splice(idx, 1);
      }
  }

  // 2.2 Assign Remaining Skippers to Regular Multi-Seat Boats (as Captains)
  const regularMultiBoats = boatSlots.filter(b => b.def.capacity > 1 && (b.def.minSkippers || 0) === 0);
  
  // Fill these with remaining skippers first (they make great captains)
  for (const slot of regularMultiBoats) {
      if (skipperClusters.length === 0) break;
      
      // Try to find one that fits
      const idx = skipperClusters.findIndex(c => isCompatible(c, slot));
      if (idx !== -1) {
          assignClusterToSlot(skipperClusters[idx], slot);
          skipperClusters.splice(idx, 1);
      }
  }

  // 2.3 Assign Volunteers (Non-Skippers) to remaining Empty Multi-Seat boats
  const emptyMultiBoats = boatSlots.filter(b => b.def.capacity > 1 && !b.hasVolunteer);
  
  for (const slot of emptyMultiBoats) {
      if (volunteerClusters.length === 0) break;
      
      let idx = volunteerClusters.findIndex(c => isCompatible(c, slot));
      if (idx !== -1) {
          assignClusterToSlot(volunteerClusters[idx], slot);
          volunteerClusters.splice(idx, 1);
      }
  }

  // --- STEP 3: BACKFILL (Fill empty seats) ---
  // Now we have "Anchored" boats. We treat remaining Skippers/Volunteers as passengers.
  const allLeftoverClusters = [...skipperClusters, ...volunteerClusters, ...passengerClusters];
  
  // Sort leftover clusters: Rank Ascending (low rank needs to be placed carefully)
  allLeftoverClusters.sort((a, b) => a.totalRank - b.totalRank);

  const fillableBoats = boatSlots.filter(b => b.remainingCapacity > 0);
  // Sort boats: Prioritize those that HAVE a volunteer but are not full.
  fillableBoats.sort((a,b) => {
      if (a.hasVolunteer && !b.hasVolunteer) return -1;
      if (!a.hasVolunteer && b.hasVolunteer) return 1;
      return b.remainingCapacity - a.remainingCapacity; // Fill big holes first
  });

  for (const cluster of allLeftoverClusters) {
      let placed = false;

      // Try 1: Find a boat with a volunteer, preference match, and compatibility
      for (const slot of fillableBoats) {
          if (slot.remainingCapacity < cluster.size) continue;
          if (!slot.hasVolunteer && slot.def.capacity > 1) continue; // Don't put passenger in empty big boat yet
          
          if (isCompatible(cluster, slot)) {
              // Check affinity (Prefer Pair)
              const hasAffinity = cluster.members.some(m => m.preferPairWith?.some(pid => slot.members.find(sm => sm.id === pid))) ||
                                  slot.members.some(sm => sm.preferPairWith?.some(pid => cluster.members.find(cm => cm.id === pid)));
              
              if (hasAffinity) {
                  assignClusterToSlot(cluster, slot);
                  placed = true;
                  break;
              }
          }
      }

      // Try 2: Find ANY boat with a volunteer that fits
      if (!placed) {
          for (const slot of fillableBoats) {
              if (slot.remainingCapacity < cluster.size) continue;
              if (!slot.hasVolunteer && slot.def.capacity > 1) continue;

              if (isCompatible(cluster, slot)) {
                  assignClusterToSlot(cluster, slot);
                  placed = true;
                  break;
              }
          }
      }

      // Try 3: Desperation - Empty boats (Single kayaks or creating a member-only boat)
      if (!placed) {
           for (const slot of fillableBoats) {
              if (slot.remainingCapacity < cluster.size) continue;
              
              // Skip if boat requires skipper but we are just passengers
              if ((slot.def.minSkippers || 0) > 0 && cluster.skipperCount === 0) continue;

              if (isCompatible(cluster, slot)) {
                  assignClusterToSlot(cluster, slot);
                  placed = true;
                  break;
              }
           }
      }
  }

  // --- STEP 4: GENERATE TEAMS ---
  const teams: Team[] = [];
  
  // 4.1 Process valid slots
  boatSlots.forEach(slot => {
      if (slot.members.length > 0) {
          const warnings: string[] = [];
          
          // Warnings Logic
          if (slot.def.capacity > 1 && !slot.hasVolunteer) warnings.push('צוות ללא מתנדב');
          if (slot.members.length === 1 && slot.def.capacity > 1) warnings.push('חותר בודד בסירה גדולה');
          
          const minSkip = slot.def.minSkippers || 0;
          if (minSkip > 0 && slot.skipperCount < minSkip) warnings.push('חסר סקיפר בסירה');
          
          // Single Kayak Warning
          if (slot.def.capacity === 1 && !slot.def.isStable) {
              const p = slot.members[0];
              if (p.rank <= 2 && p.role === Role.MEMBER) warnings.push('חותר מתחיל בקיאק יחיד');
          }

          teams.push({
              id: slot.boatId,
              members: slot.members,
              boatType: slot.def.id,
              boatCount: 1,
              warnings: warnings.length > 0 ? warnings : undefined
          });
      }
  });

  // 4.2 Handle Homeless (Cluster members not in any slot)
  const assignedIds = new Set<string>();
  teams.forEach(t => t.members.forEach(m => assignedIds.add(m.id)));
  
  people.forEach(p => {
      if (!assignedIds.has(p.id)) {
          teams.push({
              id: Math.random().toString(36).substr(2, 9),
              members: [p],
              boatType: 'UNKNOWN',
              boatCount: 0,
              warnings: ['לא שובץ (אין מקום או התנגשות)']
          });
      }
  });

  return teams;
};
