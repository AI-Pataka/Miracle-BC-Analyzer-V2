import { Timestamp } from 'firebase/firestore';

export type CapabilityLevel = 'L1' | 'L2' | 'L3' | 'L4';
export type CapabilityStatus = 'Active' | 'Planned' | 'Deprecated' | 'Under Review';

export interface Capability {
  id: string;
  name: string;
  level: CapabilityLevel;
  parentId: string | null;
  owner: string;
  systems: string[];
  status: CapabilityStatus;
  description?: string;
  children?: Capability[];
}

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  display_name: string;
  role: UserRole;
  created_at: Timestamp;
  last_login_at?: Timestamp;
  industry?: string;
  client_company?: string;
  consultant_name?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
