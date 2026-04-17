/**
 * Thin typed wrapper around the new backend endpoints added for the 9-feature
 * expansion (persisted analyses, exports, per-agent LLM config).
 *
 * Existing inline `fetch` calls elsewhere are intentionally left alone — this
 * module only covers the new surface. All requests expect `getToken()` to
 * return a fresh Firebase ID token; pass in `AuthContext.getIdToken`.
 */

import type {
  AgentConfigPublic,
  AgentName,
  AnalysisEvent,
  AnalysisRecord,
  AnalysisSummary,
  LLMProvider,
} from '../types';

// Default to a relative base so the existing Vite dev-server proxy handles
// forwarding to the backend. Override with VITE_API_BASE_URL when needed.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export type GetToken = () => Promise<string | null>;

async function authFetch(
  path: string,
  init: RequestInit,
  getToken: GetToken,
): Promise<Response> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const resp = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!resp.ok) {
    let detail = `${resp.status} ${resp.statusText}`;
    try {
      const body = await resp.json();
      if (body?.detail) detail = body.detail;
    } catch { /* non-JSON body */ }
    throw new Error(detail);
  }
  return resp;
}

// ── Analyses ────────────────────────────────────────────────────────

export interface StartAnalysisInput {
  input_text: string;
  core_assumptions: string;
  industry?: string;
  consulting_company?: string;
  client_company?: string;
  problem_statement?: string;
}

export async function startAnalysis(
  payload: StartAnalysisInput,
  getToken: GetToken,
): Promise<{ analysis_id: string }> {
  const resp = await authFetch('/api/analyze/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, getToken);
  return resp.json();
}

export async function listAnalyses(
  params: Partial<Record<'q' | 'industry' | 'client_company' | 'initiative' | 'date_from' | 'date_to', string>>,
  getToken: GetToken,
): Promise<{ analyses: AnalysisSummary[]; count: number }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  const query = qs.toString();
  const resp = await authFetch(`/api/analyses${query ? '?' + query : ''}`, { method: 'GET' }, getToken);
  return resp.json();
}

export async function getAnalysis(
  analysisId: string,
  getToken: GetToken,
): Promise<AnalysisRecord> {
  const resp = await authFetch(`/api/analyses/${encodeURIComponent(analysisId)}`, { method: 'GET' }, getToken);
  return resp.json();
}

export async function deleteAnalysis(
  analysisId: string,
  getToken: GetToken,
): Promise<void> {
  await authFetch(`/api/analyses/${encodeURIComponent(analysisId)}`, { method: 'DELETE' }, getToken);
}

/**
 * Subscribe to an analysis' SSE stream. Uses EventSource (persistent conn);
 * the Firebase token is passed as a query param because EventSource can't
 * set custom headers in the browser.
 *
 * Returns an `unsubscribe` callback that closes the stream.
 */
export function subscribeAnalysis(
  analysisId: string,
  token: string,
  handlers: {
    onEvent: (event: AnalysisEvent) => void;
    onError?: (err: Event) => void;
    onOpen?: () => void;
  },
): () => void {
  const url = `${API_BASE}/api/analyses/${encodeURIComponent(analysisId)}/stream?token=${encodeURIComponent(token)}`;
  const es = new EventSource(url);
  if (handlers.onOpen) es.onopen = handlers.onOpen;
  es.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data) as AnalysisEvent;
      handlers.onEvent(data);
      if (data.type === 'complete' || data.type === 'error') {
        es.close();
      }
    } catch (e) {
      // Ignore malformed frames rather than tearing down the whole stream.
      console.warn('SSE parse error', e, ev.data);
    }
  };
  es.onerror = (ev) => {
    if (handlers.onError) handlers.onError(ev);
    es.close();
  };
  return () => es.close();
}

export function exportUrl(
  analysisId: string,
  kind: 'pdf' | 'html' | 'markdown',
  token: string,
): string {
  return `${API_BASE}/api/analyses/${encodeURIComponent(analysisId)}/export/${kind}?token=${encodeURIComponent(token)}`;
}

// ── Agent configs ───────────────────────────────────────────────────

export async function listAgentConfigs(getToken: GetToken): Promise<{ agents: AgentConfigPublic[] }> {
  const resp = await authFetch('/api/agent-configs', { method: 'GET' }, getToken);
  return resp.json();
}

export interface SaveAgentConfigInput {
  provider: LLMProvider;
  model: string;
  api_key?: string | null;
  base_url?: string | null;
  temperature: number;
  max_tokens: number;
  skills_md: string;
  clear_api_key?: boolean;
}

export async function saveAgentConfig(
  agent: AgentName,
  payload: SaveAgentConfigInput,
  getToken: GetToken,
): Promise<AgentConfigPublic> {
  const resp = await authFetch(`/api/agent-configs/${agent}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, getToken);
  return resp.json();
}
