
export enum Role {
  INSTRUCTOR = 'INSTRUCTOR',
  VOLUNTEER = 'VOLUNTEER',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export enum AccessLevel {
  NONE = 0,
  MEMBER = 1,     // הצופה: רואה רק את השיבוץ שלו
  STAFF = 2,      // המבצע: יכול לנהל נוכחות ושיבוץ (מדריכים/מתנדבים)
  CLUB_ADMIN = 3, // המנהל: ניהול ציוד, חברים והרשאות בתוך החוג
  SUPER_ADMIN = 4 // הבעלים: ניהול מערכת גלובלי
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export const GenderLabel: Record<Gender, string> = {
  [Gender.MALE]: 'זכר',
  [Gender.FEMALE]: 'נקבה',
};

export enum MembershipStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface Certification {
  id: string;
  name: string;
  issuedAt?: string;
}

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  contactEmail: string;
  photoURL?: string;
  gender: Gender;
  birthDate: string;
  primaryPhone: string;
  emergencyContacts: EmergencyContact[];
  medicalNotes?: string;
  certifications: Certification[];
  isSkipper: boolean;
  joinedSystemDate: string;
}

export interface ClubMembership {
  uid: string;
  clubId: ClubID;
  role: Role;
  accessLevel?: AccessLevel; 
  status: MembershipStatus;
  joinedClubDate: string;
  rank: number;
  clubSpecificNotes?: string;
}

export interface ClubInvite {
  id: string;
  clubId: ClubID;
  role: Role;
  accessLevel?: AccessLevel;
  autoApprove: boolean;
  token: string;
  usageCount: number;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export const getRoleLabel = (role: Role, gender: Gender): string => {
    const labels: Record<Role, { [key in Gender]: string }> = {
        [Role.INSTRUCTOR]: { [Gender.MALE]: 'מדריך', [Gender.FEMALE]: 'מדריכה' },
        [Role.VOLUNTEER]: { [Gender.MALE]: 'מתנדב', [Gender.FEMALE]: 'מתנדבת' },
        [Role.MEMBER]: { [Gender.MALE]: 'חבר', [Gender.FEMALE]: 'חברה' },
        [Role.GUEST]: { [Gender.MALE]: 'אורח', [Gender.FEMALE]: 'אורחת' },
    };
    return labels[role][gender] || labels[role][Gender.MALE];
};

export type GenderPrefType = 'NONE' | 'MALE' | 'FEMALE';
export type ConstraintStrength = 'NONE' | 'MUST' | 'PREFER';

export interface GenderConstraint {
    type: GenderPrefType;
    strength: ConstraintStrength;
}

export const GenderPrefLabels: Record<GenderPrefType, string> = {
    'NONE': 'ללא העדפה',
    'MALE': 'גברים בלבד',
    'FEMALE': 'נשים בלבד'
};

export type BoatType = string;

export const DefaultBoatTypes = {
  DOUBLE: 'DOUBLE',
  SINGLE: 'SINGLE',
  PRIVATE: 'PRIVATE'
};

export const BoatTypeLabel: Record<string, string> = {
  [DefaultBoatTypes.DOUBLE]: 'קיאק זוגי',
  [DefaultBoatTypes.SINGLE]: 'קיאק יחיד',
  [DefaultBoatTypes.PRIVATE]: 'פרטי'
};

export interface BoatDefinition {
  id: string;
  label: string;
  isStable: boolean; 
  capacity: number; 
  defaultCount: number;
  minSkippers?: number;
}

export interface BoatInventory {
  [boatTypeId: string]: number;
}

export type ClubID = string; 

export interface Club {
    id: ClubID;
    label: string;
}

export interface ClubSettings {
  boatDefinitions: BoatDefinition[];
}

export interface UserPermission {
  email: string;
  clubId: ClubID;
  accessLevel: AccessLevel;
}

export const APP_VERSION = '5.2.0'; 

export const TEAM_COLORS = [
  'bg-blue-50 border-blue-200',      
  'bg-orange-50 border-orange-200',  
  'bg-purple-50 border-purple-200',  
  'bg-yellow-50 border-yellow-200',  
  'bg-teal-50 border-teal-200',      
  'bg-red-50 border-red-200',        
  'bg-indigo-50 border-indigo-200',  
  'bg-amber-50 border-amber-200',    
  'bg-cyan-50 border-cyan-200',      
  'bg-rose-50 border-rose-200',      
  'bg-emerald-50 border-emerald-200',
  'bg-fuchsia-50 border-fuchsia-200',
  'bg-slate-50 border-slate-200',    
  'bg-lime-50 border-lime-200',      
  'bg-violet-50 border-violet-200',  
  'bg-pink-50 border-pink-200',      
  'bg-sky-50 border-sky-200',        
  'bg-green-50 border-green-200',    
];

export interface Person {
  id: string;
  clubId: ClubID;
  name: string;
  gender: Gender;
  tags?: string[];
  phone?: string;
  role: Role;
  rank: number;
  notes?: string;
  isSkipper?: boolean;
  preferredBoatType?: string; 
  genderConstraint?: GenderConstraint;
  mustPairWith?: string[];   
  preferPairWith?: string[]; 
  cannotPairWith?: string[]; 
}

export interface PersonSnapshot {
  id: string;
  name: string;
  date: string;
  people: Person[];
}

export interface Team {
  id: string;
  members: Person[];
  boatType: BoatType;
  boatCount: number;
  warnings?: string[];
}

export interface SessionState {
  inventory: BoatInventory;
  presentPersonIds: string[];
  teams: Team[];
}

export type SyncStatus = 'SYNCED' | 'SYNCING' | 'OFFLINE' | 'ERROR';
