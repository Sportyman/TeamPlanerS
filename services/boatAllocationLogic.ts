import { BoatDefinition, BoatInventory, DefaultBoatTypes, Person, Role } from '../types';
import { buildClusters, personPrefersSingle, personRequiresDouble, personRequiresPrivate } from './pairingHelpers';

export interface BoatRecommendation {
  recommendedInventory: BoatInventory;
  warnings: string[];
  summaryText: string;
  stats: {
    totalPresent: number;
    mustDoubleCount: number;
    singleCount: number;
    privateCount: number;
    volunteersCount: number;
    skippersCount: number;
    totalRecommendedSeats: number;
  };
}

export const calculateSessionBoatRecommendation = (
  presentPeople: Person[],
  boatDefinitions: BoatDefinition[],
  currentInventory: BoatInventory
): BoatRecommendation => {
  const recommendedInventory: BoatInventory = { ...currentInventory };
  boatDefinitions.forEach((b) => { if (recommendedInventory[b.id] === undefined) recommendedInventory[b.id] = 0; });

  if (!presentPeople.length || !boatDefinitions.length) {
    return {
      recommendedInventory, warnings: [], summaryText: 'לא נבחרו משתתפים לחישוב ציוד.',
      stats: { totalPresent: 0, mustDoubleCount: 0, singleCount: 0, privateCount: 0, volunteersCount: 0, skippersCount: 0, totalRecommendedSeats: 0 },
    };
  }

  const warnings: string[] = [];
  const privateBoat = boatDefinitions.find((b) => b.id === DefaultBoatTypes.PRIVATE);
  const doubleBoat = boatDefinitions.find((b) => b.id === DefaultBoatTypes.DOUBLE) || boatDefinitions.find((b) => b.capacity === 2);
  const singleBoat = boatDefinitions.find((b) => b.id === DefaultBoatTypes.SINGLE && b.capacity === 1)
    || boatDefinitions.find((b) => b.capacity === 1 && b.id !== DefaultBoatTypes.PRIVATE);
  const multiBoats = [...boatDefinitions].filter((b) => b.capacity > 1).sort((a, b) => b.capacity - a.capacity);

  const volunteers = presentPeople.filter((p) => p.role === Role.VOLUNTEER || p.role === Role.INSTRUCTOR);
  const skippers = presentPeople.filter((p) => p.isSkipper);
  const privatePaddlers = privateBoat ? presentPeople.filter(personRequiresPrivate) : [];
  const nonPrivatePeople = presentPeople.filter((p) => !privateBoat || !personRequiresPrivate(p));

  const clusters = buildClusters(nonPrivatePeople);
  const multiClusters = clusters.filter((c) => c.size >= 2);
  const singlePersonClusters = clusters.filter((c) => c.size === 1).map((c) => c.members[0]);
  const mustDoubleSingles = singlePersonClusters.filter(personRequiresDouble);
  const volunteerSingles = singlePersonClusters.filter((p) => p.role === Role.VOLUNTEER || p.role === Role.INSTRUCTOR);
  const independentPassengers = singlePersonClusters.filter((p) => (p.role === Role.MEMBER || p.role === Role.GUEST) && personPrefersSingle(p));

  // Kayaking-style allocation: DOUBLE (vol + member) + SINGLE buddy pods (never 1 solo!)
  if (doubleBoat && multiBoats.every((b) => b.capacity <= 2)) {
    const clusterDoubles = multiClusters.reduce((sum, c) => sum + Math.ceil(c.size / 2), 0);
    const membersNeedingDouble = mustDoubleSingles.filter((p) => p.role === Role.MEMBER || p.role === Role.GUEST);
    const pairedWithVolDoubles = Math.min(membersNeedingDouble.length, volunteerSingles.length);
    const unpairedMustDouble = Math.max(0, membersNeedingDouble.length - volunteerSingles.length);
    const remainingVols = Math.max(0, volunteerSingles.length - pairedWithVolDoubles);
    const volsWantDouble = volunteerSingles.filter((p) => p.preferredBoatType === doubleBoat.id).length;
    const extraVolDoublePairs = Math.min(Math.floor(remainingVols / 2), Math.floor(Math.max(0, volsWantDouble - pairedWithVolDoubles) / 2));

    let neededDoubles = clusterDoubles + pairedWithVolDoubles + Math.ceil(unpairedMustDouble / 2) + extraVolDoublePairs;
    let neededSingles = Math.max(0, remainingVols - extraVolDoublePairs * 2) + independentPassengers.length;

    // Never send 1 solo single kayak out on the water
    const totalSinglesWithPrivate = neededSingles + privatePaddlers.length;
    if (singleBoat && totalSinglesWithPrivate === 1) {
      const canConvertDoubleToTrio = neededDoubles > clusterDoubles && membersNeedingDouble.some((m) => (m.rank || 0) >= 3);
      if (canConvertDoubleToTrio) {
        neededDoubles -= 1;
        neededSingles += 2; // 1 + 2 = 3 (שלישייה)
      } else {
        warnings.push('מספר משתתפים אי-זוגי: נותר חותר 1 ליחיד — חובה לצרף לשלישייה או לבן זוג נוסף (אין יציאה לבד).');
      }
    }

    boatDefinitions.forEach((b) => { recommendedInventory[b.id] = 0; });
    if (privateBoat) recommendedInventory[privateBoat.id] = privatePaddlers.length;
    recommendedInventory[doubleBoat.id] = neededDoubles;
    if (singleBoat) recommendedInventory[singleBoat.id] = neededSingles;
    else if (neededSingles > 0) recommendedInventory[doubleBoat.id] += Math.ceil(neededSingles / 2);

    if (unpairedMustDouble > 0) {
      warnings.push(`חסרים ${unpairedMustDouble} מתנדבים כדי לשמור על זוג מתנדב+חבר בכל קיאק זוגי.`);
    }
    const totalMustDouble = mustDoubleSingles.length + multiClusters.reduce((s, c) => s + c.size, 0);
    const totalSeats = boatDefinitions.reduce((sum, b) => sum + (recommendedInventory[b.id] || 0) * b.capacity, 0);

    return {
      recommendedInventory,
      warnings,
      summaryText: `מומלץ: ${recommendedInventory[doubleBoat.id] || 0} זוגיים` +
        (singleBoat ? ` · ${recommendedInventory[singleBoat.id] || 0} יחידים (בזוגות/שלישייה)` : '') +
        (privatePaddlers.length > 0 ? ` · ${privatePaddlers.length} פרטיים` : ''),
      stats: {
        totalPresent: presentPeople.length, mustDoubleCount: totalMustDouble,
        singleCount: singleBoat ? recommendedInventory[singleBoat.id] || 0 : 0,
        privateCount: privatePaddlers.length, volunteersCount: volunteers.length,
        skippersCount: skippers.length, totalRecommendedSeats: totalSeats,
      },
    };
  }

  // Sailing / larger multi-seat boats
  boatDefinitions.forEach((b) => { recommendedInventory[b.id] = 0; });
  if (privateBoat) recommendedInventory[privateBoat.id] = privatePaddlers.length;
  let remainingSeats = nonPrivatePeople.length;
  let availSkippers = skippers.length;
  for (const boat of multiBoats) {
    if (remainingSeats <= 0) break;
    const reqSkip = boat.minSkippers || 0;
    const count = Math.min(Math.ceil(remainingSeats / boat.capacity), reqSkip > 0 ? Math.floor(availSkippers / reqSkip) : 99);
    if (count > 0) {
      recommendedInventory[boat.id] = count;
      remainingSeats = Math.max(0, remainingSeats - count * boat.capacity);
      availSkippers -= count * reqSkip;
    }
  }
  if (remainingSeats > 0) warnings.push(`נותרו ${remainingSeats} משתתפים ללא מקום לפי מגבלת סקיפרים (${skippers.length}).`);
  const totalSeats = boatDefinitions.reduce((sum, b) => sum + (recommendedInventory[b.id] || 0) * b.capacity, 0);

  return {
    recommendedInventory, warnings,
    summaryText: `הותאם ל-${presentPeople.length} משתתפים (${skippers.length} סקיפרים זמינים).`,
    stats: {
      totalPresent: presentPeople.length, mustDoubleCount: multiClusters.reduce((s, c) => s + c.size, 0),
      singleCount: 0, privateCount: privatePaddlers.length, volunteersCount: volunteers.length,
      skippersCount: skippers.length, totalRecommendedSeats: totalSeats,
    },
  };
};
