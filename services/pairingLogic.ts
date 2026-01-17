import { Person, Role, BoatInventory, Team, BoatDefinition, GenderPrefType } from '../types';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

// --- Internal Helper for local algorithm (Fallback) ---
interface Cluster {
  id: string;
  members: Person[];
  hasVolunteer: boolean;
  skipperCount: number;
  totalRank: number;
  roles: Role[];
  size: number;
}

/**
 * Local pairing algorithm used as a fallback if AI service is unavailable.
 */
const generateLocalPairings = (
  people: Person[], 
  inventory: BoatInventory,
  boatDefinitions: BoatDefinition[]
): Team[] => {
  const teams: Team[] = [];
  const currentInventory = { ...inventory };
  
  const sortedBoatDefs = [...boatDefinitions].sort((a, b) => {
      if (b.capacity !== a.capacity) return b.capacity - a.capacity;
      return (a.isStable === b.isStable) ? 0 : a.isStable ? 1 : -1;
  });

  let availablePeople = [...people];
  const clusters: Cluster[] = [];

  while (availablePeople.length > 0) {
      const root = availablePeople[0];
      const clusterMembers = [root];
      availablePeople.shift();

      let changed = true;
      while (changed) {
          changed = false;
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

  let captainClusters = clusters.filter(c => c.hasVolunteer);
  let passengerClusters = clusters.filter(c => !c.hasVolunteer);

  captainClusters.sort((a, b) => b.totalRank - a.totalRank);
  passengerClusters.sort((a, b) => a.totalRank - b.totalRank);

  const useBoat = (boatTypeId: string) => {
      if ((currentInventory[boatTypeId] || 0) > 0) {
          currentInventory[boatTypeId] -= 1;
          return true;
      }
      return false;
  };

  const newId = () => Math.random().toString(36).substr(2, 9);

  const isCompatible = (cluster: Cluster, currentTeamMembers: Person[]): boolean => {
      for (const newPerson of cluster.members) {
          for (const existingPerson of currentTeamMembers) {
              if (newPerson.cannotPairWith?.includes(existingPerson.id)) return false;
              if (existingPerson.cannotPairWith?.includes(newPerson.id)) return false;
              if (newPerson.genderConstraint?.type !== 'NONE' && newPerson.genderConstraint?.strength === 'MUST') {
                  const req = newPerson.genderConstraint.type;
                  if (req === 'MALE' && existingPerson.gender !== 'MALE') return false;
                  if (req === 'FEMALE' && existingPerson.gender !== 'FEMALE') return false;
              }
              if (existingPerson.genderConstraint?.type !== 'NONE' && existingPerson.genderConstraint?.strength === 'MUST') {
                  const req = existingPerson.genderConstraint.type;
                   if (req === 'MALE' && newPerson.gender !== 'MALE') return false;
                   if (req === 'FEMALE' && newPerson.gender !== 'FEMALE') return false;
              }
          }
      }
      return true;
  };

  const multiSeatBoats = sortedBoatDefs.filter(b => b.capacity > 1);

  for (const boatDef of multiSeatBoats) {
      let availableCount = currentInventory[boatDef.id] || 0;
      const requiresSkipper = (boatDef.minSkippers || 0) > 0;

      while (availableCount > 0) {
          let teamMembers: Person[] = [];
          let remainingCapacity = boatDef.capacity;
          let currentSkipperCount = 0;

          let capIndex = -1;
          if (requiresSkipper) {
               capIndex = captainClusters.findIndex(c => 
                   c.size <= remainingCapacity && 
                   c.skipperCount > 0 &&
                   (c.members[0].preferredBoatType ? c.members[0].preferredBoatType === boatDef.id : true)
               );
               if (capIndex === -1) {
                   capIndex = captainClusters.findIndex(c => c.size <= remainingCapacity && c.skipperCount > 0);
               }
          } 
          if (capIndex === -1) {
             capIndex = captainClusters.findIndex(c => 
                  c.size <= remainingCapacity && 
                  (c.members[0].preferredBoatType ? c.members[0].preferredBoatType === boatDef.id : true)
              );
              if (capIndex === -1) {
                  capIndex = captainClusters.findIndex(c => c.size <= remainingCapacity);
              }
          }

          if (capIndex !== -1) {
              const capCluster = captainClusters[capIndex];
              captainClusters.splice(capIndex, 1);
              teamMembers.push(...capCluster.members);
              remainingCapacity -= capCluster.size;
              currentSkipperCount += capCluster.skipperCount;
          } else {
              break; 
          }

          while (remainingCapacity > 0) {
              let bestPassIdx = -1;
              bestPassIdx = passengerClusters.findIndex(c => {
                  if (c.size > remainingCapacity) return false;
                  if (!isCompatible(c, teamMembers)) return false;
                  const hasAffinity = c.members.some(m => 
                      m.preferPairWith?.some(pid => teamMembers.find(tm => tm.id === pid))
                  ) || teamMembers.some(tm => 
                      tm.preferPairWith?.some(pid => c.members.find(cm => cm.id === pid))
                  );
                  return hasAffinity;
              });

              if (bestPassIdx === -1) {
                  bestPassIdx = passengerClusters.findIndex(c => 
                      c.size <= remainingCapacity && isCompatible(c, teamMembers)
                  );
              }
              
              if (bestPassIdx === -1 && captainClusters.length > 0) {
                  const needMoreSkippers = requiresSkipper && currentSkipperCount < (boatDef.minSkippers || 0);
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
                      continue;
                  }
              }

              if (bestPassIdx !== -1) {
                  const passCluster = passengerClusters[bestPassIdx];
                  passengerClusters.splice(bestPassIdx, 1);
                  teamMembers.push(...passCluster.members);
                  remainingCapacity -= passCluster.size;
                  currentSkipperCount += passCluster.skipperCount;
              } else {
                  break;
              }
          }

          if (teamMembers.length > 0) {
             const warnings: string[] = [];
             const hasVol = teamMembers.some(m => m.role === Role.VOLUNTEER || m.role === Role.INSTRUCTOR);
             if (boatDef.capacity > 1 && !hasVol) warnings.push('צוות ללא מתנדב');
             if (teamMembers.length === 1 && boatDef.capacity > 1) warnings.push('חותר בודד בסירה זוגית');
             const totalSkippers = teamMembers.filter(m => m.isSkipper).length;
             if ((boatDef.minSkippers || 0) > 0 && totalSkippers < (boatDef.minSkippers || 0)) warnings.push('חסר סקיפר בסירה');

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
              break;
          }
      }
  }

  const singleSeatBoats = sortedBoatDefs.filter(b => b.capacity === 1);
  const leftovers = [...captainClusters, ...passengerClusters];

  for (const boatDef of singleSeatBoats) {
      let availableCount = currentInventory[boatDef.id] || 0;
      while (availableCount > 0 && leftovers.length > 0) {
          let candidateIdx = leftovers.findIndex(c => 
              c.size === 1 && c.members[0].preferredBoatType === boatDef.id
          );
          if (candidateIdx === -1) {
              candidateIdx = leftovers.findIndex(c => c.size === 1);
          }
          if (candidateIdx !== -1) {
              const cluster = leftovers[candidateIdx];
              leftovers.splice(candidateIdx, 1);
              const warnings: string[] = [];
              if (cluster.totalRank <= 2 && !cluster.hasVolunteer && !boatDef.isStable) warnings.push('חותר מתחיל בקיאק יחיד');
              const totalSkippers = cluster.members.filter(m => m.isSkipper).length;
              if ((boatDef.minSkippers || 0) > 0 && totalSkippers < (boatDef.minSkippers || 0)) warnings.push('נדרש סקיפר');
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
              break; 
          }
      }
  }

  if (leftovers.length > 0) {
      const remainingBoats = boatDefinitions.filter(b => (currentInventory[b.id] || 0) > 0);
      remainingBoats.sort((a,b) => b.capacity - a.capacity);
      for (const boatDef of remainingBoats) {
           let availableCount = currentInventory[boatDef.id] || 0;
           while(availableCount > 0 && leftovers.length > 0) {
               const idx = leftovers.findIndex(c => c.size <= boatDef.capacity);
               if (idx !== -1) {
                   const cluster = leftovers[idx];
                   leftovers.splice(idx, 1);
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
                   if ((boatDef.minSkippers || 0) > 0 && totalSkippers < (boatDef.minSkippers || 0)) warnings.push('חסר סקיפר בסירה');
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
                   break;
               }
           }
      }
  }

  leftovers.forEach(cluster => {
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

/**
 * Main pairing function using Gemini 3 Pro for advanced boat allocation.
 */
export const generateSmartPairings = async (
  people: Person[], 
  inventory: BoatInventory,
  boatDefinitions: BoatDefinition[]
): Promise<Team[]> => {
  // Always initialize AI instance locally right before making an API call to use latest env key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // Separate system context for better instruction following
    const systemInstruction = `As a professional boat pairing assistant, create optimal boat assignments for the following session.
      
      RULES:
      1. Capacity: Never exceed boat capacity.
      2. Roles: Multi-seat boats (capacity > 1) should ideally have at least one INSTRUCTOR or VOLUNTEER (Captain).
      3. Skippers: If a boat definition specifies minSkippers > 0, the team must have that many people with isSkipper=true.
      4. Constraints:
         - mustPairWith: IDs of people who MUST be in the same boat.
         - cannotPairWith: IDs of people who MUST NOT be in the same boat.
         - genderConstraint: Strictly follow if strength is 'MUST'.
         - preferredBoatType: Try to honor if possible.
      5. Rank: Lower rank (1-2) members need more experienced partners.`;

    const userPrompt = `
      DATA:
      - Participants: ${JSON.stringify(people.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role,
          rank: p.rank,
          gender: p.gender,
          isSkipper: p.isSkipper,
          must: p.mustPairWith,
          cannot: p.cannotPairWith,
          genderConstraint: p.genderConstraint,
          prefBoat: p.preferredBoatType
        })))}
      - Inventory Counts: ${JSON.stringify(inventory)}
      - Boat Definitions: ${JSON.stringify(boatDefinitions)}
      
      Return a JSON array of boat assignments.
    `;

    // Utilize generateContent with gemini-3-pro-preview and thinking budget for complex reasoning
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 16384 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              boatType: { type: Type.STRING },
              memberIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              warnings: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['boatType', 'memberIds']
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
        throw new Error("AI returned an empty response.");
    }
    
    // Using trim() on text property before parsing as per guidelines
    const parsedResults = JSON.parse(text.trim());
    
    // Map IDs back to full Person objects and generate final Team array
    return parsedResults.map((res: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      boatType: res.boatType,
      boatCount: 1,
      members: res.memberIds.map((id: string) => people.find(p => p.id === id)).filter(Boolean) as Person[],
      warnings: res.warnings
    }));

  } catch (error) {
    console.warn("AI Pairing failed, falling back to local algorithm:", error);
    return generateLocalPairings(people, inventory, boatDefinitions);
  }
};