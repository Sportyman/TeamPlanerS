

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

/**
 * The "Cluster & Fill" Pairing Algorithm
 * 1. Groups people who MUST be together into Clusters.
 * 2. Prioritizes filling multi-seat boats with a Captain (Volunteer) + Passengers.
 * 3. Strictly enforces Capacity.
 * 4. Respects Blacklists and Gender Constraints.
 */
export const generateSmartPairings = (
  people: Person[], 
  inventory: BoatInventory,
  boatDefinitions: BoatDefinition[]
): Team[] => {
  const teams: Team[] = [];
  
  // --- STEP 1: PREPARE INVENTORY ---
  // Create a mutable copy of inventory
  const currentInventory = { ...inventory };
  
  // Sort boat definitions: Largest capacity first, then by Stability
  const sortedBoatDefs = [...boatDefinitions].sort((a, b) => {
      if (b.capacity !== a.capacity) return b.capacity - a.capacity; // Descending Capacity
      return (a.isStable === b.isStable) ? 0 : a.isStable ? 1 : -1; // Stable first preferred for big boats
  });

  // --- STEP 2: CLUSTERING (Build Blocks) ---
  // If Person A must pair with Person B, they become a single unit.
  let availablePeople = [...people];
  const clusters: Cluster[] = [];

  while (availablePeople.length > 0) {
      const root = availablePeople[0];
      const clusterMembers = [root];
      availablePeople.shift(); // Remove root

      // Recursively find all connected 'mustPairWith' partners
      // Note: This implementation assumes if A must pair with B, B is pulled in.
      // It handles chains (A->B->C) by repeated scanning.
      let changed = true;
      while (changed) {
          changed = false;
          // Find anyone in the pool who must pair with someone currently in the cluster
          // OR anyone in the cluster who must pair with someone in the pool
          
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
          
          // 2. Check if anyone in pool MUST pair with someone in cluster
          for (let i = 0; i < availablePeople.length; i++) {
              const candidate = availablePeople[i];
              if (candidate.mustPairWith) {
                  const matchFound = candidate.mustPairWith.some(targetId => 
                      clusterMembers.some(m => m.id === targetId)
                  );
                  if (matchFound) {
                      clusterMembers.push(candidate);
                      availablePeople.splice(i, 1);
                      i--; // Adjust index
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

  // Separate Clusters into queues
  // 1. Captains: Clusters containing at least one Volunteer or Instructor
  // 2. Passengers: Clusters with only Members/Guests
  let captainClusters = clusters.filter(c => c.hasVolunteer);
  let passengerClusters = clusters.filter(c => !c.hasVolunteer);

  // Sort Captains by Rank (Strongest first)
  captainClusters.sort((a, b) => b.totalRank - a.totalRank);
  // Sort Passengers by Need (Lowest rank first - they need help most)
  passengerClusters.sort((a, b) => a.totalRank - b.totalRank);

  const useBoat = (boatTypeId: string) => {
      if ((currentInventory[boatTypeId] || 0) > 0) {
          currentInventory[boatTypeId] -= 1;
          return true;
      }
      return false;
  };

  const newId = () => Math.random().toString(36).substr(2, 9);

  // Helper: Check compatibility
  const isCompatible = (cluster: Cluster, currentTeamMembers: Person[]): boolean => {
      for (const newPerson of cluster.members) {
          for (const existingPerson of currentTeamMembers) {
              
              // 1. Blacklist Check (Bi-directional)
              if (newPerson.cannotPairWith?.includes(existingPerson.id)) return false;
              if (existingPerson.cannotPairWith?.includes(newPerson.id)) return false;

              // 2. Gender Constraints (Strict MUST)
              // If newPerson MUST be with same gender
              if (newPerson.genderConstraint?.type !== 'NONE' && newPerson.genderConstraint?.strength === 'MUST') {
                  const req = newPerson.genderConstraint.type; // MALE or FEMALE
                  // If required Male, and existing is Female -> Fail
                  if (req === 'MALE' && existingPerson.gender !== 'MALE') return false;
                  if (req === 'FEMALE' && existingPerson.gender !== 'FEMALE') return false;
              }

              // If existingPerson MUST be with same gender
              if (existingPerson.genderConstraint?.type !== 'NONE' && existingPerson.genderConstraint?.strength === 'MUST') {
                  const req = existingPerson.genderConstraint.type;
                   if (req === 'MALE' && newPerson.gender !== 'MALE') return false;
                   if (req === 'FEMALE' && newPerson.gender !== 'FEMALE') return false;
              }
          }
      }
      return true;
  };

  // --- STEP 3: FILL MULTI-SEAT BOATS ---
  const multiSeatBoats = sortedBoatDefs.filter(b => b.capacity > 1);

  for (const boatDef of multiSeatBoats) {
      let availableCount = currentInventory[boatDef.id] || 0;
      const requiresSkipper = (boatDef.minSkippers || 0) > 0;

      while (availableCount > 0) {
          // Logic: We need to build a team for this boat.
          // Ideally: Starts with a Captain Cluster, fills with Passenger Clusters.
          
          let teamMembers: Person[] = [];
          let remainingCapacity = boatDef.capacity;
          let currentSkipperCount = 0;

          // A. Try to find a Captain Cluster that fits
          // If boat requires skipper, prioritize clusters with skippers
          let capIndex = -1;
          
          if (requiresSkipper) {
               // Find captain with skipper qualification first
               capIndex = captainClusters.findIndex(c => 
                   c.size <= remainingCapacity && 
                   c.skipperCount > 0 &&
                   (c.members[0].preferredBoatType ? c.members[0].preferredBoatType === boatDef.id : true)
               );
               if (capIndex === -1) {
                   // Try without preference match
                   capIndex = captainClusters.findIndex(c => c.size <= remainingCapacity && c.skipperCount > 0);
               }
          } 
          
          // If no skipper found (or not required), fall back to any captain
          if (capIndex === -1) {
             capIndex = captainClusters.findIndex(c => 
                  c.size <= remainingCapacity && 
                  (c.members[0].preferredBoatType ? c.members[0].preferredBoatType === boatDef.id : true)
              );
              if (capIndex === -1) {
                  capIndex = captainClusters.findIndex(c => c.size <= remainingCapacity);
              }
          }

          // If we found a captain cluster
          if (capIndex !== -1) {
              const capCluster = captainClusters[capIndex];
              captainClusters.splice(capIndex, 1); // Remove from pool
              teamMembers.push(...capCluster.members);
              remainingCapacity -= capCluster.size;
              currentSkipperCount += capCluster.skipperCount;
          } else {
              // No captain fits or available. 
              // Skip this boat for now (unless we are desperate, but we handle desperate in Step 5).
              break; 
          }

          // B. Fill Remaining Spots with Passengers (or extra captains if needed)
          while (remainingCapacity > 0) {
              // Try to find best fitting passenger cluster
              let bestPassIdx = -1;

              // 1. Look for PREFERRED Match (Soft constraint)
              // Someone in current team PREFERS someone in candidate cluster OR vice versa
              bestPassIdx = passengerClusters.findIndex(c => {
                  if (c.size > remainingCapacity) return false;
                  if (!isCompatible(c, teamMembers)) return false;
                  
                  // Check Soft Preferences
                  const hasAffinity = c.members.some(m => 
                      m.preferPairWith?.some(pid => teamMembers.find(tm => tm.id === pid))
                  ) || teamMembers.some(tm => 
                      tm.preferPairWith?.some(pid => c.members.find(cm => cm.id === pid))
                  );
                  return hasAffinity;
              });

              // 2. If no preference match, take first compatible that fits
              if (bestPassIdx === -1) {
                  bestPassIdx = passengerClusters.findIndex(c => 
                      c.size <= remainingCapacity && isCompatible(c, teamMembers)
                  );
              }
              
              // 3. If no passenger fits, can we put another captain cluster? (Two volunteers in one boat)
              // Especially useful if we still need skippers
              if (bestPassIdx === -1 && captainClusters.length > 0) {
                  const needMoreSkippers = requiresSkipper && currentSkipperCount < (boatDef.minSkippers || 0);
                  
                  // If we need skippers, prioritize skipper clusters
                  let extraCapIdx = -1;
                  if (needMoreSkippers) {
                       extraCapIdx = captainClusters.findIndex(c => 
                          c.size <= remainingCapacity && c.skipperCount > 0 && isCompatible(c, teamMembers)
                       );
                  }
                  
                  if (extraCapIdx === -1) {
                      extraCapIdx = captainClusters.findIndex(c => 
                          c.size <= remainingCapacity && isCompatible(c, teamMembers)
                      );
                  }

                  if (extraCapIdx !== -1) {
                      const extra = captainClusters[extraCapIdx];
                      captainClusters.splice(extraCapIdx, 1);
                      teamMembers.push(...extra.members);
                      remainingCapacity -= extra.size;
                      currentSkipperCount += extra.skipperCount;
                      continue; // Loop again
                  }
              }

              if (bestPassIdx !== -1) {
                  const passCluster = passengerClusters[bestPassIdx];
                  passengerClusters.splice(bestPassIdx, 1);
                  teamMembers.push(...passCluster.members);
                  remainingCapacity -= passCluster.size;
                  currentSkipperCount += passCluster.skipperCount;
              } else {
                  // No one fits or is compatible. Stop filling this boat.
                  break;
              }
          }

          // C. Commit Team
          // Only save if we actually put someone in
          if (teamMembers.length > 0) {
             const warnings: string[] = [];
             
             // Analyze Team
             const hasVol = teamMembers.some(m => m.role === Role.VOLUNTEER || m.role === Role.INSTRUCTOR);
             
             if (boatDef.capacity > 1 && !hasVol) {
                 warnings.push('צוות ללא מתנדב');
             }
             if (teamMembers.length === 1 && boatDef.capacity > 1) {
                 warnings.push('חותר בודד בסירה זוגית');
             }
             
             // Check Skipper Requirement
             const totalSkippers = teamMembers.filter(m => m.isSkipper).length;
             if ((boatDef.minSkippers || 0) > 0 && totalSkippers < (boatDef.minSkippers || 0)) {
                 warnings.push('חסר סקיפר בסירה');
             }

             teams.push({
                id: newId(),
                members: teamMembers,
                boatType: boatDef.id,
                boatCount: 1,
                warnings: warnings.length > 0 ? warnings : undefined
             });
             
             useBoat(boatDef.id);
             availableCount--;
          } else {
              // Could not start a team (e.g. logic prevented it). Move to next boat type.
              break;
          }
      }
  }

  // --- STEP 4: FILL SINGLE BOATS ---
  const singleSeatBoats = sortedBoatDefs.filter(b => b.capacity === 1);
  const leftovers = [...captainClusters, ...passengerClusters]; // Combine remaining clusters

  for (const boatDef of singleSeatBoats) {
      let availableCount = currentInventory[boatDef.id] || 0;

      while (availableCount > 0 && leftovers.length > 0) {
          // Find a cluster of size 1
          // Prefer those who PREFER single boats
          let candidateIdx = leftovers.findIndex(c => 
              c.size === 1 && c.members[0].preferredBoatType === boatDef.id
          );

          if (candidateIdx === -1) {
              // Just find any size 1
              candidateIdx = leftovers.findIndex(c => c.size === 1);
          }
          
          if (candidateIdx !== -1) {
              const cluster = leftovers[candidateIdx];
              leftovers.splice(candidateIdx, 1);
              
              const warnings: string[] = [];
              // Warn if a low-rank member is alone in single kayak (unless stable)
              if (cluster.totalRank <= 2 && !cluster.hasVolunteer && !boatDef.isStable) {
                  warnings.push('חותר מתחיל בקיאק יחיד');
              }
              
              // Only check skipper if boat specifically mandates it (unlikely for singles but possible)
              const totalSkippers = cluster.members.filter(m => m.isSkipper).length;
              if ((boatDef.minSkippers || 0) > 0 && totalSkippers < (boatDef.minSkippers || 0)) {
                 warnings.push('נדרש סקיפר');
              }

              teams.push({
                  id: newId(),
                  members: cluster.members,
                  boatType: boatDef.id,
                  boatCount: 1,
                  warnings: warnings.length > 0 ? warnings : undefined
              });
              useBoat(boatDef.id);
              availableCount--;
          } else {
              // Only large clusters left, cannot fit in single.
              // Move to next single boat type if exists
              break; 
          }
      }
  }

  // --- STEP 5: OVERFLOW (Stragglers) ---
  // If we still have people (probably in clusters > 1, or singles we couldn't fit),
  // and we have ANY boats left (even doubles), use them.
  
  if (leftovers.length > 0) {
      // Try to put remaining clusters into ANY available boat
      const remainingBoats = boatDefinitions.filter(b => (currentInventory[b.id] || 0) > 0);
      remainingBoats.sort((a,b) => b.capacity - a.capacity); // Big first

      for (const boatDef of remainingBoats) {
           let availableCount = currentInventory[boatDef.id] || 0;
           while(availableCount > 0 && leftovers.length > 0) {
               // Take first cluster that fits
               const idx = leftovers.findIndex(c => c.size <= boatDef.capacity);
               
               if (idx !== -1) {
                   const cluster = leftovers[idx];
                   leftovers.splice(idx, 1);
                   
                   // Can we fit MORE leftovers in this same boat?
                   let teamMembers = [...cluster.members];
                   let remainingCapacity = boatDef.capacity - cluster.size;
                   
                   while(remainingCapacity > 0 && leftovers.length > 0) {
                        const nextIdx = leftovers.findIndex(c => c.size <= remainingCapacity && isCompatible(c, teamMembers));
                        if (nextIdx !== -1) {
                             const nextC = leftovers[nextIdx];
                             leftovers.splice(nextIdx, 1);
                             teamMembers.push(...nextC.members);
                             remainingCapacity -= nextC.size;
                        } else {
                            break;
                        }
                   }

                   const warnings: string[] = [];
                   if (!teamMembers.some(m => m.role === Role.VOLUNTEER || m.role === Role.INSTRUCTOR)) warnings.push('צוות ללא מתנדב');
                   if (teamMembers.length === 1 && boatDef.capacity > 1) warnings.push('חותר בודד בסירה גדולה');
                   
                   const totalSkippers = teamMembers.filter(m => m.isSkipper).length;
                   if ((boatDef.minSkippers || 0) > 0 && totalSkippers < (boatDef.minSkippers || 0)) {
                       warnings.push('חסר סקיפר בסירה');
                   }

                   teams.push({
                      id: newId(),
                      members: teamMembers,
                      boatType: boatDef.id,
                      boatCount: 1,
                      warnings: warnings.length > 0 ? warnings : undefined
                   });
                   useBoat(boatDef.id);
                   availableCount--;

               } else {
                   // No cluster fits this boat (e.g. cluster size 3, boat size 2).
                   // Try next boat type.
                   break;
               }
           }
      }
  }

  // --- STEP 6: HOMELESS ---
  // Anyone still in leftovers has no boat
  leftovers.forEach(cluster => {
      // Break cluster apart for reporting
      cluster.members.forEach(p => {
          teams.push({
              id: newId(),
              members: [p],
              boatType: 'UNKNOWN',
              boatCount: 0,
              warnings: ['אין סירה פנויה (או התנגשות)']
          });
      });
  });

  return teams;
};