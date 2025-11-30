
import { Person, Role, BoatInventory, Team, BoatDefinition } from '../types';

/**
 * The Smart Pairing Algorithm - Dynamic Capacity Edition
 */
export const generateSmartPairings = (
  people: Person[], 
  inventory: BoatInventory,
  boatDefinitions: BoatDefinition[]
): Team[] => {
  const teams: Team[] = [];
  
  // 1. Separate by Role
  const volunteers = people.filter(p => p.role === Role.VOLUNTEER);
  // Treat Guests as Members for matching logic
  const members = people.filter(p => p.role === Role.MEMBER || p.role === Role.GUEST);

  // 2. Sort Lists
  // Strongest volunteers first
  volunteers.sort((a, b) => b.rank - a.rank);
  // Lowest rank members first (Highest Need)
  members.sort((a, b) => a.rank - b.rank);

  // Mutable copies
  let availableVols = [...volunteers];
  let availableMems = [...members];
  let currentInventory = { ...inventory };

  const useBoat = (boatTypeId: string) => {
      if (currentInventory[boatTypeId] > 0) {
          currentInventory[boatTypeId] -= 1;
          return true;
      }
      return false;
  };
  
  const newId = () => Math.random().toString(36).substr(2, 9);

  // Helper: Sort boats
  const multiSeatBoats = boatDefinitions.filter(b => b.capacity > 1);
  const singleSeatBoats = boatDefinitions.filter(b => b.capacity === 1);

  // Sort multi-seat by capacity descending (fill big boats first)
  multiSeatBoats.sort((a, b) => b.capacity - a.capacity);

  // --- PASS 1: Fill Multi-Seat Boats (STRICT: Must have a Member) ---
  for (const boatDef of multiSeatBoats) {
      let count = currentInventory[boatDef.id] || 0;
      
      while (count > 0 && (availableVols.length > 0 || availableMems.length > 0)) {
          // CRITICAL FIX: If no members are left, DO NOT use a multi-seat boat yet.
          // Save the boat and the volunteers for the Single Pass or Overflow Pass.
          if (availableMems.length === 0) {
              break; 
          }

          const teamMembers: Person[] = [];
          
          // 1. Assign Captain (Volunteer)
          if (availableVols.length > 0) {
              teamMembers.push(availableVols.shift()!);
          }

          // 2. Fill remaining spots with Members
          const spotsLeft = boatDef.capacity - teamMembers.length;
          
          for (let i = 0; i < spotsLeft; i++) {
              if (availableMems.length > 0) {
                  teamMembers.push(availableMems.shift()!);
              } else if (availableVols.length > 0) {
                  // Option: Fill with extra volunteers? 
                  // In strict pass, we usually prefer to save volunteers for single boats if members are done.
                  // But if we already started the boat (because we had a member), we might fill it.
                  // Logic: Only fill if we actually added a member in this loop?
                  // Simplified: Just fill up.
                  teamMembers.push(availableVols.shift()!);
              }
          }

          // Validation: Did we actually create a valid team?
          // We want at least one person.
          if (teamMembers.length > 0) {
             const warnings: string[] = [];
             const hasVol = teamMembers.some(m => m.role === Role.VOLUNTEER);
             const lowRankMembers = teamMembers.filter(m => m.role !== Role.VOLUNTEER && m.rank <= 2);
             
             if (!hasVol && lowRankMembers.length > 0) {
                 warnings.push('חברים ברמה נמוכה ללא מתנדב');
             }
             
             // Commit the team
             teams.push({
                id: newId(),
                members: teamMembers,
                boatType: boatDef.id,
                boatCount: 1,
                warnings: warnings.length > 0 ? warnings : undefined
             });
            
             useBoat(boatDef.id);
             count--;
          } else {
              break; 
          }
      }
  }

  // --- PASS 2: Fill Single Boats ---
  for (const boatDef of singleSeatBoats) {
      let count = currentInventory[boatDef.id] || 0;
      
      while (count > 0 && (availableVols.length > 0 || availableMems.length > 0)) {
          let person: Person | null = null;
          let warning: string | undefined = undefined;

          // Priority: High rank members -> Volunteers -> Low rank members (with warning)
          const competentMemberIdx = availableMems.findIndex(m => m.rank >= 4);
          
          if (competentMemberIdx !== -1) {
              person = availableMems.splice(competentMemberIdx, 1)[0];
          } else if (availableVols.length > 0) {
              person = availableVols.shift()!;
          } else if (availableMems.length > 0) {
              person = availableMems.shift()!;
              warning = 'חבר ברמה נמוכה בקיאק יחיד!';
          }

          if (person) {
              teams.push({
                  id: newId(),
                  members: [person],
                  boatType: boatDef.id,
                  boatCount: 1,
                  warnings: warning ? [warning] : undefined
              });
              useBoat(boatDef.id);
              count--;
          } else {
              break;
          }
      }
  }

  // --- PASS 3: Overflow (Leftover Volunteers to Remaining Multi-Seat) ---
  // If we still have volunteers and multi-seat boats, put them there (even alone or pairs)
  if (availableVols.length > 0) {
      for (const boatDef of multiSeatBoats) {
          let count = currentInventory[boatDef.id] || 0;
          while (count > 0 && availableVols.length > 0) {
              const teamMembers: Person[] = [];
              // Fill boat with volunteers up to capacity
              for(let i=0; i<boatDef.capacity; i++) {
                  if(availableVols.length > 0) teamMembers.push(availableVols.shift()!);
              }

              teams.push({
                  id: newId(),
                  members: teamMembers,
                  boatType: boatDef.id,
                  boatCount: 1,
                  warnings: teamMembers.length < boatDef.capacity && boatDef.capacity > 2 ? ['צוות חסר'] : undefined
              });
              useBoat(boatDef.id);
              count--;
          }
      }
  }

  // --- PASS 4: Leftovers (No Boat) ---
  const allLeftovers = [...availableVols, ...availableMems];
  if (allLeftovers.length > 0) {
       allLeftovers.forEach(p => {
           teams.push({
               id: newId(),
               members: [p],
               boatType: 'UNKNOWN',
               boatCount: 0,
               warnings: ['אין סירה פנויה']
           });
       });
  }

  return teams;
};
