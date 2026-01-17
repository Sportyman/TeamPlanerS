
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

// --- INITIAL PEOPLE (Expanded Superheroes Data - 20 Total) ---
// 2 Instructors, 8 Volunteers, 8 Members, 2 Guests
export const INITIAL_PEOPLE: Person[] = [
    // --- INSTRUCTORS (2) ---
    { id: 'k1', clubId: 'KAYAK', name: 'ברוס ויין (באטמן)', gender: Gender.MALE, role: Role.INSTRUCTOR, rank: 5, phone: '050-9999999', tags: [SAMPLE_TAG], isSkipper: true },
    { id: 'k3', clubId: 'KAYAK', name: 'דיאנה פרינס (וונדר וומן)', gender: Gender.FEMALE, role: Role.INSTRUCTOR, rank: 5, phone: '050-7777777', tags: [SAMPLE_TAG], isSkipper: true },

    // --- VOLUNTEERS (8 - Sidekicks) ---
    { id: 'v1', clubId: 'KAYAK', name: 'דיק גרייסון (רובין)', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 4, phone: '050-1111111', tags: [SAMPLE_TAG] },
    { id: 'v2', clubId: 'KAYAK', name: 'אלפרד פניוורת', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 5, phone: '050-2222222', tags: [SAMPLE_TAG] },
    { id: 'v3', clubId: 'KAYAK', name: 'ברברה גורדון (באטגירל)', gender: Gender.FEMALE, role: Role.VOLUNTEER, rank: 4, phone: '050-3333333', tags: [SAMPLE_TAG] },
    { id: 'v4', clubId: 'KAYAK', name: 'באקי בארנס (חייל החורף)', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 5, phone: '050-4444444', tags: [SAMPLE_TAG] },
    { id: 'v5', clubId: 'KAYAK', name: 'סם וילסון (פלקון)', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 4, phone: '050-5555555', tags: [SAMPLE_TAG] },
    { id: 'v6', clubId: 'KAYAK', name: 'גיימס רודס (וור משין)', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 5, phone: '050-6666666', tags: [SAMPLE_TAG] },
    { id: 'v7', clubId: 'KAYAK', name: 'לואיס (מ-אנטמן)', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 3, phone: '050-7777777', tags: [SAMPLE_TAG] },
    { id: 'v8', clubId: 'KAYAK', name: 'קריפטו (סופר-דוג)', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 5, phone: '050-8888888', tags: [SAMPLE_TAG] },

    // --- MEMBERS (8) ---
    { id: 'm1', clubId: 'KAYAK', name: 'קלארק קנט (סופרמן)', gender: Gender.MALE, role: Role.MEMBER, rank: 5, phone: '052-1111111', tags: [SAMPLE_TAG] },
    { id: 'm2', clubId: 'KAYAK', name: 'פיטר פארקר (ספיידרמן)', gender: Gender.MALE, role: Role.MEMBER, rank: 3, phone: '052-2222222', tags: [SAMPLE_TAG] },
    { id: 'm3', clubId: 'KAYAK', name: 'בארי אלן (פלאש)', gender: Gender.MALE, role: Role.MEMBER, rank: 2, phone: '052-3333333', tags: [SAMPLE_TAG] },
    { id: 'm4', clubId: 'KAYAK', name: 'ארתור קורי (אקוומן)', gender: Gender.MALE, role: Role.MEMBER, rank: 4, phone: '052-4444444', tags: [SAMPLE_TAG] },
    { id: 'm5', clubId: 'KAYAK', name: 'וונדה מקסימוף (סקרלט)', gender: Gender.FEMALE, role: Role.MEMBER, rank: 2, phone: '052-5555555', tags: [SAMPLE_TAG] },
    { id: 'm6', clubId: 'KAYAK', name: 'נטשה רומנוף (אלמנה)', gender: Gender.FEMALE, role: Role.MEMBER, rank: 5, phone: '052-6666666', tags: [SAMPLE_TAG] },
    { id: 'm7', clubId: 'KAYAK', name: 'סטיב רוגרס (קפטן)', gender: Gender.MALE, role: Role.MEMBER, rank: 5, phone: '052-7777777', tags: [SAMPLE_TAG] },
    { id: 'm8', clubId: 'KAYAK', name: 'תור (אל הרעם)', gender: Gender.MALE, role: Role.MEMBER, rank: 4, phone: '052-8888888', tags: [SAMPLE_TAG] },

    // --- GUESTS (2) ---
    { id: 'g1', clubId: 'KAYAK', name: 'לוקי', gender: Gender.MALE, role: Role.GUEST, rank: 1, phone: '058-1111111', tags: [SAMPLE_TAG] },
    { id: 'g2', clubId: 'KAYAK', name: 'הגוקר', gender: Gender.MALE, role: Role.GUEST, rank: 1, phone: '058-2222222', tags: [SAMPLE_TAG] },
    
    // Copy for SAILING to maintain structure
    { id: 's1', clubId: 'SAILING', name: 'טוני סטארק', gender: Gender.MALE, role: Role.INSTRUCTOR, rank: 5, phone: '054-9999999', tags: [SAMPLE_TAG], isSkipper: true },
    { id: 's2', clubId: 'SAILING', name: "סטיב רוג'רס", gender: Gender.MALE, role: Role.VOLUNTEER, rank: 5, phone: '054-8888888', tags: [SAMPLE_TAG] }
];
