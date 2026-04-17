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

// ── Analysis persistence ──────────────────────────────────────────────

export type AgentName =
  | 'master' | 'context' | 'capability' | 'journey'
  | 'systems' | 'financial' | 'qa';

export type LLMProvider = 'anthropic' | 'openai' | 'google' | 'custom';

export interface AgentConfigPublic {
  agent_name: AgentName;
  provider: LLMProvider;
  model: string;
  has_custom_key: boolean;
  base_url: string;
  temperature: number;
  max_tokens: number;
  skills_md: string;
}

export type StageName =
  | 'context' | 'capability' | 'journey' | 'systems'
  | 'financial' | 'merge' | 'qa';

export interface StageState {
  status: 'pending' | 'running' | 'done';
  started_at: string;
  duration_ms: number;
  output: string;
  attempt: number;
}

export interface AnalysisSummary {
  analysis_id: string;
  created_at: string;
  updated_at: string;
  industry: string;
  consulting_company: string;
  client_company: string;
  initiative_name: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  qa_pass: boolean;
  attempts: number;
}

export interface AnalysisRecord extends AnalysisSummary {
  user_id: string;
  problem_statement: string;
  input_text: string;
  core_assumptions: string;
  current_stage: string;
  stages: Record<StageName, StageState>;
  events: AnalysisEvent[];
  final_output: string;
  qa_feedback: string;
  error: string;
}

export type AnalysisEvent =
  | { type: 'status'; status: string }
  | { type: 'stage_start'; stage: StageName; label: string; attempt: number; started_at?: string }
  | { type: 'stage_done'; stage: StageName; label: string; duration_ms: number }
  | { type: 'stage_output'; stage: StageName; markdown: string }
  | { type: 'qa_retry'; attempt: number; feedback: string }
  | { type: 'complete'; qa_pass: boolean; qa_feedback: string; attempts: number; final_output: string }
  | { type: 'error'; detail: string };

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
