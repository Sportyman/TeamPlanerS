

export type ClubID = string;

export enum Role {
  INSTRUCTOR = 'INSTRUCTOR',
  VOLUNTEER = 'VOLUNTEER',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export type RoleColor = 'cyan' | 'orange' | 'purple' | 'emerald' | 'blue' | 'indigo' | 'pink' | 'slate' | 'red' | 'amber';

export const RoleColorClasses: Record<RoleColor, { bg: string, text: string, border: string, ring: string, badge: string }> = {
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-500', ring: 'ring-cyan-500', badge: 'bg-cyan-100 text-cyan-800' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-500', ring: 'ring-orange-500', badge: 'bg-orange-100 text-orange-800' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-500', ring: 'ring-purple-500', badge: 'bg-purple-100 text-purple-800' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-500', ring: 'ring-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-500', ring: 'ring-blue-500', badge: 'bg-blue-100 text-blue-800' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-500', ring: 'ring-indigo-500', badge: 'bg-indigo-100 text-indigo-800' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-900', border: 'border-pink-500', ring: 'ring-pink-500', badge: 'bg-pink-100 text-pink-800' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-900', border: 'border-slate-500', ring: 'ring-slate-500', badge: 'bg-slate-100 text-slate-800' },
    red: { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-500', ring: 'ring-red-500', badge: 'bg-red-100 text-red-800' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-500', ring: 'ring-amber-500', badge: 'bg-amber-100 text-amber-800' },
};

export const getRoleLabel = (role: Role, gender: Gender): string => {
    const labels: Record<Role, { [key in Gender]: string }> = {
        [Role.INSTRUCTOR]: { [Gender.MALE]: 'מדריך', [Gender.FEMALE]: 'מדריכה' },
        [Role.VOLUNTEER]: { [Gender.MALE]: 'מתנדב', [Gender.FEMALE]: 'מתנדבת' },
        [Role.MEMBER]: { [Gender.MALE]: 'חבר', [Gender.FEMALE]: 'חברה' },
        [Role.GUEST]: { [Gender.MALE]: 'אורח', [Gender.FEMALE]: 'אורחת' },
    };
    return labels[role][gender] || labels[role][Gender.MALE];
};

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum GenderPrefType {
  NONE = 'NONE',
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export interface GenderConstraint {
  type: GenderPrefType;
  strength: 'SOFT' | 'MUST';
}

export interface Participant {
  id: string;
  name: string;
  gender: Gender;
  phone?: string;
  email?: string;
  createdAt: string; // The original join date to Etgarim
  globalNotes?: string;
  memberships: Record<string, ClubMembership>; // Record<ClubID, ClubMembership>
}

export interface ClubMembership {
  role: Role;
  rank: number;
  isSkipper?: boolean;
  joinedClubAt: string;
  lastParticipation?: string;
  participationDates: string[]; // Log of every attendance
  notes?: string;
  // Pairing logic properties
  mustPairWith?: string[];
  cannotPairWith?: string[];
  genderConstraint?: GenderConstraint;
  preferredBoatType?: string;
  preferPairWith?: string[];
}

/**
 * UI View Model for a person in a specific club context
 */
export interface Person extends ClubMembership {
  id: string;
  name: string;
  gender: Gender;
  phone?: string;
  email?: string;
  clubId: string;
  // Mock data property
  tags?: string[];
}

export type BoatType = string;
export const DefaultBoatTypes = { DOUBLE: 'DOUBLE', SINGLE: 'SINGLE', PRIVATE: 'PRIVATE' };

export const BoatTypeLabel: Record<string, string> = {
  DOUBLE: 'קיאק זוגי',
  SINGLE: 'קיאק יחיד',
  PRIVATE: 'פרטי',
  sonar: 'סונאר',
  hanse: 'הנזה',
  zodiac: 'סירת ליווי'
};

export interface BoatDefinition {
  id: string;
  label: string;
  isStable: boolean; 
  capacity: number; 
  defaultCount: number;
  minSkippers?: number;
}

export interface BoatInventory { [boatTypeId: string]: number; }
export interface Club { id: string; label: string; }
export interface ClubSettings { boatDefinitions: BoatDefinition[]; roleColors: Record<Role, RoleColor>; }
export interface UserPermission { email: string; allowedClubs: string[]; }

export interface Team {
  id: string;
  members: Person[];
  boatType: BoatType;
  boatCount: number;
  // Pairing logic property
  warnings?: string[];
}

export interface SessionState {
  inventory: BoatInventory;
  presentPersonIds: string[];
  teams: Team[];
}

export type SyncStatus = 'SYNCED' | 'SYNCING' | 'OFFLINE' | 'ERROR';
export const APP_VERSION = '3.5.0';

export const TEAM_COLORS = [
  'bg-blue-50 border-blue-200', 'bg-orange-50 border-orange-200', 'bg-purple-50 border-purple-200',
  'bg-yellow-50 border-yellow-200', 'bg-teal-50 border-teal-200', 'bg-red-50 border-red-200',
  'bg-indigo-50 border-indigo-200', 'bg-amber-50 border-amber-200', 'bg-cyan-50 border-cyan-200',
];