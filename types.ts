
export enum Role {
  VOLUNTEER = 'VOLUNTEER',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export const RoleLabel: Record<Role, string> = {
  [Role.VOLUNTEER]: 'מתנדב',
  [Role.MEMBER]: 'חבר',
  [Role.GUEST]: 'אורח',
};

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export const GenderLabel: Record<Gender, string> = {
  [Gender.MALE]: 'זכר',
  [Gender.FEMALE]: 'נקבה',
};

export enum BoatType {
  DOUBLE = 'DOUBLE', // 2 seats
  SINGLE = 'SINGLE', // 1 seat
  PRIVATE = 'PRIVATE', // Owner's boat
}

export const BoatTypeLabel: Record<BoatType, string> = {
  [BoatType.DOUBLE]: 'קיאק זוגי',
  [BoatType.SINGLE]: 'קיאק יחיד',
  [BoatType.PRIVATE]: 'סירה פרטית',
};

// Multi-Tenancy Definitions
export enum ClubID {
  KAYAK = 'KAYAK',
  SAILING = 'SAILING'
}

export const ClubLabel: Record<ClubID, string> = {
  [ClubID.KAYAK]: 'מועדון הקיאקים',
  [ClubID.SAILING]: 'מועדון השייט'
};

export interface UserPermission {
  email: string;
  allowedClubs: ClubID[];
}

export const APP_VERSION = '2.2.0'; // Minor version bump for tags and dashboard

// High contrast palette
export const TEAM_COLORS = [
  'bg-blue-50 border-blue-200',      // Cool (Blue)
  'bg-orange-50 border-orange-200',  // Warm (Orange)
  'bg-purple-50 border-purple-200',  // Cool (Purple)
  'bg-yellow-50 border-yellow-200',  // Warm (Yellow)
  'bg-teal-50 border-teal-200',      // Cool (Teal)
  'bg-red-50 border-red-200',        // Warm (Red)
  'bg-indigo-50 border-indigo-200',  // Cool (Indigo)
  'bg-amber-50 border-amber-200',    // Warm (Amber)
  'bg-cyan-50 border-cyan-200',      // Cool (Cyan)
  'bg-rose-50 border-rose-200',      // Warm (Rose)
  'bg-emerald-50 border-emerald-200',// Cool (Emerald)
  'bg-fuchsia-50 border-fuchsia-200',// Warm (Fuchsia)
  'bg-slate-50 border-slate-200',    // Neutral
  'bg-lime-50 border-lime-200',      // Warm (Lime)
  'bg-violet-50 border-violet-200',  // Cool (Violet)
  'bg-pink-50 border-pink-200',      // Warm (Pink)
  'bg-sky-50 border-sky-200',        // Cool (Sky)
  'bg-green-50 border-green-200',    // Warm/Nature (Green)
];

export interface PersonConstraints {
  preferredBoat?: BoatType;
  mandatoryPartnerId?: string;
  forbiddenPartnerIds?: string[];
}

export interface Person {
  id: string;
  clubId: ClubID; // Association to specific club
  name: string;
  gender: Gender;
  tags?: string[]; // Custom tags for logic (e.g. "Skipper", "Crane")
  phone?: string;
  role: Role;
  rank: number; // 1 (Novice) to 5 (Expert)
  notes?: string;
  preferredPartners?: string[]; // IDs of preferred people
  constraints?: PersonConstraints;
}

export interface BoatInventory {
  doubles: number;
  singles: number;
  privates: number;
}

export interface Team {
  id: string;
  members: Person[];
  boatType: BoatType;
  boatCount: number; // usually 1, but could be 2 for "2 Singles"
  warnings?: string[];
}

export interface SessionState {
  inventory: BoatInventory;
  presentPersonIds: string[];
  teams: Team[];
}
