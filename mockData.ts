
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

const SAMPLE_TAG = 'קבוצה לדוגמה';

// --- INITIAL PEOPLE (SUPERHEROES DATA) ---
export const INITIAL_PEOPLE: Person[] = [
    // --- KAYAK ---
    { id: 'k1', clubId: 'KAYAK', name: 'ברוס ויין (באטמן)', gender: Gender.MALE, role: Role.INSTRUCTOR, rank: 5, phone: '050-9999999', notes: 'בעל סירה פרטית', tags: [SAMPLE_TAG, 'סקיפר'], isSkipper: true },
    { id: 'k2', clubId: 'KAYAK', name: 'קלארק קנט (סופרמן)', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 5, phone: '050-8888888', tags: [SAMPLE_TAG, 'חזק מאוד'] },
    { id: 'k3', clubId: 'KAYAK', name: 'דיאנה פרינס (וונדר וומן)', gender: Gender.FEMALE, role: Role.INSTRUCTOR, rank: 5, phone: '050-7777777', tags: [SAMPLE_TAG, 'סקיפר'], isSkipper: true },
    { id: 'k4', clubId: 'KAYAK', name: 'בארי אלן (פלאש)', gender: Gender.MALE, role: Role.MEMBER, rank: 2, phone: '052-1111111', tags: [SAMPLE_TAG], notes: 'חותר מהיר במיוחד' },
    { id: 'k5', clubId: 'KAYAK', name: 'ארתור קורי (אקוומן)', gender: Gender.MALE, role: Role.MEMBER, rank: 4, phone: '052-2222222', tags: [SAMPLE_TAG], notes: 'מרגיש בבית במים' },
    { id: 'k6', clubId: 'KAYAK', name: 'פיטר פארקר (ספיידרמן)', gender: Gender.MALE, role: Role.GUEST, rank: 3, phone: '053-3333333', tags: [SAMPLE_TAG], notes: 'אורח מהעיר הגדולה' },

    // --- SAILING ---
    { id: 's1', clubId: 'SAILING', name: 'טוני סטארק (איירון מן)', gender: Gender.MALE, role: Role.INSTRUCTOR, rank: 5, phone: '054-9999999', tags: [SAMPLE_TAG, 'טכנולוגי'], isSkipper: true },
    { id: 's2', clubId: 'SAILING', name: "סטיב רוג'רס (קפטן אמריקה)", gender: Gender.MALE, role: Role.VOLUNTEER, rank: 5, phone: '054-8888888', tags: [SAMPLE_TAG, 'מנהיג'] },
    { id: 's3', clubId: 'SAILING', name: 'נטשה רומנוף (האלמנה השחורה)', gender: Gender.FEMALE, role: Role.INSTRUCTOR, rank: 5, phone: '054-7777777', tags: [SAMPLE_TAG, 'סקיפר'], isSkipper: true },
    { id: 's4', clubId: 'SAILING', name: "וונדה מקסימוף (סקרלט וויץ')", gender: Gender.FEMALE, role: Role.MEMBER, rank: 2, phone: '055-1111111', tags: [SAMPLE_TAG] },
    { id: 's5', clubId: 'SAILING', name: 'תור (אל הרעם)', gender: Gender.MALE, role: Role.MEMBER, rank: 4, phone: '055-2222222', tags: [SAMPLE_TAG], notes: 'צריך משוט כבד' },
    { id: 's6', clubId: 'SAILING', name: 'לוקי', gender: Gender.MALE, role: Role.GUEST, rank: 1, phone: '058-3333333', tags: [SAMPLE_TAG], notes: 'אורח שובב' },
];
