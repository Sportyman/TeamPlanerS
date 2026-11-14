import { ClubID, Person, Role } from '../types';

export type PollIntent = 'ATTENDING' | 'DECLINING' | 'MAYBE' | 'UNVOTED';

export interface PollOptionClassification {
  intent: PollIntent;
  detectedRole?: Role;
}

export interface PollColorToken {
  id: string;
  label: string;
  dotClass: string;
  surfaceClass: string;
  textClass: string;
  borderClass: string;
}

export interface PollEvent {
  id: string;
  pollId: string;
  group: string;
  question: string;
  options: string[];
  createdAtMs: number;
  displayDate: string;
  displayTime: string;
  colorToken: PollColorToken;
}

export interface PollVote {
  id: string;
  pollId: string;
  voter: string;
  pushName?: string;
  profilePicUrl?: string;
  phone?: string;
  selectedOptions: string[];
  timestampMs: number;
}

export interface WhatsAppMemberMapping {
  id: string;
  voterId: string;
  pushName?: string;
  profilePicUrl?: string;
  phone?: string;
  uid?: string;
  clubId?: ClubID;
  matchedBy?: 'PHONE' | 'MANUAL' | 'BOT_SYNC';
  updatedAt?: string;
  updatedBy?: string;
}

export interface KeywordRule {
  id: string;
  keyword: string;
  intent: 'ATTENDING' | 'DECLINING' | 'MAYBE';
  role?: Role;
}

export interface ClubWhatsAppConfig {
  clubId: ClubID;
  linkedGroups: string[];
  keywordRules: KeywordRule[];
  pollColors?: Record<string, string>;
  activePollId?: string;
  updatedAt?: string;
}

export interface ResolvedVoter {
  voterId: string;
  displayName: string;
  profilePicUrl?: string;
  phone?: string;
  selectedOptions: string[];
  intent: PollIntent;
  pollRole?: Role;
  effectiveRole: Role;
  person?: Person;
  mapping?: WhatsAppMemberMapping;
  suggestedPerson?: Person;
  matchSource: 'MANUAL_MAP' | 'PHONE_AUTO' | 'UNMAPPED';
  timestampMs: number;
  updatedRecently?: boolean;
}

export interface VoteChangeAlert {
  id: string;
  pollId: string;
  voterId: string;
  displayName: string;
  profilePicUrl?: string;
  personId?: string;
  previousOptions: string[];
  newOptions: string[];
  previousIntent: PollIntent;
  newIntent: PollIntent;
  newRole?: Role;
  detectedAt: string;
  dismissed?: boolean;
}

export interface PersonPollStatus {
  intent: PollIntent;
  pollRole?: Role;
  selectedOptions: string[];
  updatedRecently: boolean;
}

export interface ResolvedPollCounts {
  totalAttending: number;
  volunteers: number;
  members: number;
  guests: number;
  instructors: number;
  declining: number;
  maybe: number;
  unmappedAttending: number;
}

export interface ResolvedPollSummary {
  poll: PollEvent;
  counts: ResolvedPollCounts;
  voters: ResolvedVoter[];
  attendingPersonIds: string[];
  personStatusMap: Record<string, PersonPollStatus>;
}
