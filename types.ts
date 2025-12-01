
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

// Gender Preference Definitions
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

// Dynamic Boat Type
export type BoatType = string;

// Standard Defaults (for fallback/init)
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
}

export interface BoatInventory {
  [boatTypeId: string]: number;
}

// Club Definitions
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
  allowedClubs: ClubID[];
}

export const APP_VERSION = '2.9.0';

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
  
  // Pairing Constraints
  preferredBoatType?: string; 
  
  // New Granular Constraints
  genderConstraint?: GenderConstraint;
  
  mustPairWith?: string[];   // Hard constraint (Green)
  preferPairWith?: string[]; // Soft constraint (Yellow)
  cannotPairWith?: string[]; // Hard negative (Red)
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
