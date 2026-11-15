import { BoatDefinition, DefaultBoatTypes, Club } from './types';

// --- CLUBS ---
export const DEFAULT_CLUBS: Club[] = [
    { id: 'KAYAK', label: 'מועדון הקיאקים' },
    { id: 'SAILING', label: 'מועדון השייט' }
];

// --- BOAT DEFINITIONS ---
export const KAYAK_DEFINITIONS: BoatDefinition[] = [
  { id: DefaultBoatTypes.DOUBLE, label: 'קיאק זוגי', isStable: true, capacity: 2, defaultCount: 5 },
  { id: DefaultBoatTypes.SINGLE, label: 'קיאק יחיד', isStable: false, capacity: 1, defaultCount: 3 },
  { id: DefaultBoatTypes.PRIVATE, label: 'פרטי', isStable: false, capacity: 1, defaultCount: 0 },
];

export const SAILING_DEFINITIONS: BoatDefinition[] = [
  { id: 'sonar', label: 'סונאר', isStable: true, capacity: 5, defaultCount: 2, minSkippers: 1 },
  { id: 'hanse', label: 'הנזה', isStable: true, capacity: 2, defaultCount: 1, minSkippers: 1 },
  { id: 'zodiac', label: 'סירת ליווי', isStable: false, capacity: 3, defaultCount: 1, minSkippers: 1 },
];
