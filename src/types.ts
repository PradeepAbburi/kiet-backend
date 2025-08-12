export type Role = 'ADMIN' | 'PRINCIPAL' | 'HTPO' | 'CTPO' | 'PLG_MEMBER';

export type Year = 'Y1' | 'Y2' | 'Y3' | 'Y4';
export type Branch = 'CSM' | 'CAI' | 'CSD' | 'AID' | 'CSC';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  year?: Year; // for CTPO/PLG
  branch?: Branch; // for CTPO/HTPO
  passwordHash?: string; // admin bootstrap only
}

export interface PLGMember {
  id: string;
  name: string;
  email: string;
}

export interface PLGGroup {
  id: string;
  name: string; // e.g., PLG-1
  year: Year;
  branch: Branch;
  members: PLGMember[]; // up to 5
}

export interface ActivityEntry {
  id: string;
  timestamp: number;
  plgId: string;
  memberId?: string; // optional if group level
  type:
    | 'ATTENDANCE'
    | 'WEEKLY_MODULE'
    | 'CERTIFICATION'
    | 'PROJECT_MILESTONE'
    | 'HELPING_PEER'
    | 'HACKATHON'
    | 'INTERNSHIP_OFFER'
    | 'GITHUB_PUBLISH'
    | 'WIN_CHALLENGE'
    | 'EVENT_ATTENDED';
  points: number;
  createdByUserId: string; // CTPO/HTPO/Admin who awarded
}

export interface DatabaseSchema {
  users: User[];
  plgs: PLGGroup[];
  activities: ActivityEntry[];
  archivedYears: string[]; // e.g., "2024-25"
}


