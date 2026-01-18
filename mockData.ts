
import { Person, Gender, Role, BoatDefinition, DefaultBoatTypes, Club } from './types';

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

// --- INITIAL PEOPLE (DUMMY DATA) ---
export const INITIAL_PEOPLE: Person[] = [
    // Kayak - Volunteers & Instructors
    { id: 'k1', clubId: 'KAYAK', name: 'דורון שמעוני', gender: Gender.MALE, role: Role.INSTRUCTOR, rank: 5, phone: '050-1111111', notes: 'מדריך ראשי', tags: ['מדריך', 'סמכות מקצועית'], isSkipper: true },
    { id: 'k2', clubId: 'KAYAK', name: 'ענת לביא', gender: Gender.FEMALE, role: Role.VOLUNTEER, rank: 4, phone: '050-2222222', tags: [] },
    { id: 'k3', clubId: 'KAYAK', name: 'יואב גל', gender: Gender.MALE, role: Role.INSTRUCTOR, rank: 5, phone: '050-3333333', tags: ['חובש', 'מדריך'], isSkipper: true },
    { id: 'k4', clubId: 'KAYAK', name: 'מיכל אהרוני', gender: Gender.FEMALE, role: Role.VOLUNTEER, rank: 3, phone: '050-4444444', tags: [] },
    // Kayak - Members
    { id: 'k5', clubId: 'KAYAK', name: 'דניאל אברהמי', gender: Gender.MALE, role: Role.MEMBER, rank: 1, phone: '052-5555555', notes: 'צריך תמיכה בגב', tags: ['מנוף'] },
    { id: 'k6', clubId: 'KAYAK', name: 'רונית כהן', gender: Gender.FEMALE, role: Role.MEMBER, rank: 2, phone: '052-6666666', tags: [] },
    { id: 'k7', clubId: 'KAYAK', name: 'אבי לוי', gender: Gender.MALE, role: Role.MEMBER, rank: 3, phone: '052-7777777', tags: [], preferPairWith: ['k9'] },
    { id: 'k8', clubId: 'KAYAK', name: 'שרה נתניהו', gender: Gender.FEMALE, role: Role.MEMBER, rank: 1, phone: '052-8888888', tags: ['מנוף', 'שומרת נגיעה'], genderConstraint: { type: 'FEMALE', strength: 'MUST' } },
    { id: 'k9', clubId: 'KAYAK', name: 'יוסי בניון', gender: Gender.MALE, role: Role.MEMBER, rank: 4, phone: '052-9999999', tags: ['חותר עצמאי'] },
    { id: 'k10', clubId: 'KAYAK', name: 'נועה קירל', gender: Gender.FEMALE, role: Role.MEMBER, rank: 2, phone: '053-1234567', tags: [] },

    // Sailing - Volunteers
    { id: 's1', clubId: 'SAILING', name: 'גיורא איילנד', gender: Gender.MALE, role: Role.INSTRUCTOR, rank: 5, phone: '054-1111111', tags: ['סקיפר'], isSkipper: true },
    { id: 's2', clubId: 'SAILING', name: 'תמר זנדברג', gender: Gender.FEMALE, role: Role.VOLUNTEER, rank: 4, phone: '054-2222222', tags: ['סקיפר'], isSkipper: true },
    { id: 's3', clubId: 'SAILING', name: 'עופר שלח', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 3, phone: '054-3333333', tags: ['איש צוות'] },
    { id: 's4', clubId: 'SAILING', name: 'מרב מיכאלי', gender: Gender.FEMALE, role: Role.VOLUNTEER, rank: 5, phone: '054-4444444', tags: ['סקיפר'], isSkipper: true, genderConstraint: { type: 'FEMALE', strength: 'PREFER' } },
    // Sailing - Members
    { id: 's5', clubId: 'SAILING', name: 'נורית פלד', gender: Gender.FEMALE, role: Role.MEMBER, rank: 2, phone: '055-5555555', tags: [] },
    { id: 's6', clubId: 'SAILING', name: 'אמיר חצרוני', gender: Gender.MALE, role: Role.MEMBER, rank: 3, phone: '055-6666666', tags: [], cannotPairWith: ['s8'] },
    { id: 's7', clubId: 'SAILING', name: 'גלית גוטמן', gender: Gender.FEMALE, role: Role.MEMBER, rank: 1, phone: '055-7777777', tags: ['כסא גלגלים'] },
    { id: 's8', clubId: 'SAILING', name: 'אייל ברקוביץ', gender: Gender.MALE, role: Role.MEMBER, rank: 4, phone: '055-8888888', tags: ['חותר חזק'] },
    { id: 's9', clubId: 'SAILING', name: 'אופירה אסייג', gender: Gender.FEMALE, role: Role.MEMBER, rank: 2, phone: '055-9999999', tags: [] },
    { id: 's10', clubId: 'SAILING', name: 'רני רהב', gender: Gender.MALE, role: Role.MEMBER, rank: 1, phone: '058-1234567', tags: [] },
];
