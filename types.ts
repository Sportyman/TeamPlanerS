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

export interface PersonConstraints {
  preferredBoat?: BoatType;
  mandatoryPartnerId?: string;
  forbiddenPartnerIds?: string[];
}

export interface Person {
  id: string;
  name: string;
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