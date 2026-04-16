import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, CheckCircle2, XCircle, AlertCircle,
  RotateCcw, Building2, Briefcase, Globe, ChevronRight, Upload,
  Pencil, Trash2, RefreshCw, Sparkles, ShieldCheck, History,
  BarChart3, Layers, Route, Server, DollarSign, GitMerge, ShieldQuestion, Loader2,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { ReportDashboard } from '../components/ReportDashboard';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type EnginePhase = 'input' | 'analyzing' | 'review' | 'generating' | 'result' | 'error';

const INDUSTRY_OPTIONS = [
  'Telecommunications',
  'Banking',
  'Insurance',
  'Healthcare',
  'Retail',
  'Manufacturing',
  'Energy & Utilities',
  'Government',
  'Technology',
  'Other',
];

// ─── Assumption Row ─────────────────────────────────────────────────────────

const AssumptionRow: React.FC<{
  index: number;
  text: string;
  onUpdate: (val: string) => void;
  onRemove: () => void;
}> = ({ index, text, onUpdate, onRemove }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  const handleSave = () => {
    onUpdate(draft.trim());
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 group">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-100 text-accent-700 text-sm font-bold flex items-center justify-center mt-0.5">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              className="w-full text-sm border border-accent-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-400 bg-white resize-none"
              rows={3}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setDraft(text); setEditing(false); } }}
            />
            <div className="flex items-center gap-2">
              <button onClick={handleSave} className="text-xs font-semibold px-3 py-1.5 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors">Save</button>
              <button onClick={() => { setDraft(text); setEditing(false); }} className="text-xs font-medium px-3 py-1.5 text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
        )}
      </div>
      {!editing && (
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { setDraft(text); setEditing(true); }} className="p-1.5 rounded-lg text-slate-400 hover:text-accent-600 hover:bg-accent-50 transition-colors" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRemove} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Remove">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

export const IdeaEntry: React.FC = () => {
  const { profile, getIdToken } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [industry, setIndustry] = useState('');
  const [consultingCompany, setConsultingCompany] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Pipeline state
  const [phase, setPhase] = useState<EnginePhase>('input');
  const [coreAssumptions, setCoreAssumptions] = useState('');
  const [finalOutput, setFinalOutput] = useState('');
  const [qaPass, setQaPass] = useState(false);
  const [qaFeedback, setQaFeedback] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Streaming pipeline progress
  type StageStatus = 'pending' | 'running' | 'done' | 'error';
  interface PipelineStage {
    stage: string;
    label: string;
    status: StageStatus;
    startedAt?: number;
    duration?: number;
    attempt?: number;
  }
  const PIPELINE_STAGE_DEFS: PipelineStage[] = [
    { stage: 'context',    label: 'Market Context & KPIs',   status: 'pending' },
    { stage: 'capability', label: 'Capability Design',        status: 'pending' },
    { stage: 'journey',    label: 'Journey Mapping',          status: 'pending' },
    { stage: 'systems',    label: 'Architecture & Systems',   status: 'pending' },
    { stage: 'financial',  label: 'Financial Analysis',       status: 'pending' },
    { stage: 'merge',      label: 'Compiling Report',         status: 'pending' },
    { stage: 'qa',         label: 'QA Validation',            status: 'pending' },
  ];
  const STAGE_ICONS: Record<string, React.ReactNode> = {
    context:    <BarChart3 className="w-4 h-4" />,
    capability: <Layers className="w-4 h-4" />,
    journey:    <Route className="w-4 h-4" />,
    systems:    <Server className="w-4 h-4" />,
    financial:  <DollarSign className="w-4 h-4" />,
    merge:      <GitMerge className="w-4 h-4" />,
    qa:         <ShieldQuestion className="w-4 h-4" />,
  };
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(PIPELINE_STAGE_DEFS);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // Pre-populate from user profile
  useEffect(() => {
    if (profile) {
      if (profile.industry && !industry) setIndustry(profile.industry);
      if (profile.consultant_name && !consultingCompany) setConsultingCompany(profile.consultant_name);
      if (profile.client_company && !clientCompany) setClientCompany(profile.client_company);
    }
  }, [profile]);

  const [isDragOver, setIsDragOver] = useState(false);

  const canAnalyze = industry.trim() && consultingCompany.trim() && clientCompany.trim() && problemStatement.trim();

  // ─── Compose input_text ──────────────────────────────────────────────

  const composeInputText = (): string => {
    return [
      `Industry: ${industry}`,
      `Consulting Company: ${consultingCompany}`,
      `Client Company: ${clientCompany}`,
      '',
      '--- Opportunity Canvas ---',
      '',
      problemStatement,
    ].join('\n');
  };

  // ─── Step 1: POST /api/initiate ──────────────────────────────────────

  const handleAnalyze = async () => {
    setPhase('analyzing');
    setError(null);
    try {
      console.log('🔐 Getting ID token...');
      const token = await getIdToken();
      console.log('✅ Token obtained:', token ? '***' : 'null');
      if (!token) throw new Error('Not authenticated. Please log in again.');

      console.log('📤 Sending POST /api/initiate...');
      const res = await fetch('/api/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ input_text: composeInputText() }),
      });

      console.log('📥 Response status:', res.status);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Request failed (${res.status})`);
      }

      const data = await res.json();
      console.log('✅ Got assumptions:', data.core_assumptions.substring(0, 100) + '...');
      setCoreAssumptions(data.core_assumptions);
      setPhase('review');
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message || 'Analysis initiation failed.');
      setPhase('error');
    }
  };

  // ─── Step 2: POST /api/approve/stream ────────────────────────────────

  const handleApprove = async () => {
    setPhase('generating');
    setError(null);
    setPipelineStages(PIPELINE_STAGE_DEFS);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated. Please log in again.');

      const res = await fetch('/api/approve/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          input_text: composeInputText(),
          core_assumptions: coreAssumptions,
          approved: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Pipeline failed (${res.status})`);
      }

      if (!res.body) throw new Error('No response body from server.');

      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse complete SSE lines from the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // keep incomplete last chunk

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event: any;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.type === 'stage_start') {
            setPipelineStages(prev => prev.map(s =>
              s.stage === event.stage
                ? { ...s, status: 'running', startedAt: Date.now(), attempt: event.attempt }
                : s
            ));
            // Yield to React so the "running" state is rendered before the next event
            await new Promise(r => setTimeout(r, 0));
          } else if (event.type === 'stage_done') {
            setPipelineStages(prev => prev.map(s =>
              s.stage === event.stage
                ? { ...s, status: 'done', duration: event.duration_ms }
                : s
            ));
            await new Promise(r => setTimeout(r, 0));
          } else if (event.type === 'qa_retry') {
            // Reset all stages for retry
            setPipelineStages(PIPELINE_STAGE_DEFS);
            await new Promise(r => setTimeout(r, 0));
          } else if (event.type === 'complete') {
            setFinalOutput(event.final_output);
            setQaPass(event.qa_pass);
            setQaFeedback(event.qa_feedback || '');
            setAttempts(event.attempts || 1);
            setPhase('result');
          } else if (event.type === 'error') {
            throw new Error(event.detail);
          }
        }
      }
    } catch (err: any) {
      // "Failed to fetch" is the browser's generic message when it can't reach the server at all.
      // Translate it into something actionable for the user.
      const raw: string = err?.message || '';
      let message = raw;
      if (
        raw === 'Failed to fetch' ||
        raw.toLowerCase().includes('networkerror') ||
        raw.toLowerCase().includes('load failed')
      ) {
        message =
          'Cannot connect to the analysis server. ' +
          'Please make sure the backend is running (uvicorn main:app --reload) ' +
          'and try again.';
      }
      setError(message || 'Pipeline execution failed.');
      setPhase('error');
    }
  };

  const handleReject = () => {
    setPhase('input');
    setCoreAssumptions('');
  };

  const handleReset = () => {
    readerRef.current?.cancel();
    setPhase('input');
    setCoreAssumptions('');
    setFinalOutput('');
    setQaPass(false);
    setQaFeedback('');
    setAttempts(0);
    setError(null);
    setUploadedFileName(null);
    setPipelineStages(PIPELINE_STAGE_DEFS);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setProblemStatement(text.trim());
      setUploadedFileName(file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setProblemStatement(text.trim());
      setUploadedFileName(file.name);
    };
    reader.readAsText(file);
  };

  // ─── Render helpers ──────────────────────────────────────────────────

  const renderSpinner = (message: string, sub?: string) => (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-accent-200 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-accent-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-lg font-semibold text-slate-700">{message}</p>
      {sub && <p className="text-sm text-slate-400">{sub}</p>}
    </div>
  );

  const renderGeneratingPhase = () => {
    const doneCount = pipelineStages.filter(s => s.status === 'done').length;
    const total = pipelineStages.length;
    const progressPct = Math.round((doneCount / total) * 100);

    const statusColors: Record<string, string> = {
      pending: 'bg-slate-100 border-slate-200 text-slate-400',
      running: 'bg-accent-50 border-accent-300 text-accent-600',
      done:    'bg-emerald-50 border-emerald-200 text-emerald-700',
      error:   'bg-rose-50 border-rose-200 text-rose-600',
    };
    const iconBg: Record<string, string> = {
      pending: 'bg-slate-200 text-slate-400',
      running: 'bg-accent-500 text-white',
      done:    'bg-emerald-500 text-white',
      error:   'bg-rose-500 text-white',
    };

    const formatDuration = (ms?: number) => {
      if (!ms) return '';
      if (ms < 1000) return `${ms}ms`;
      return `${(ms / 1000).toFixed(1)}s`;
    };

    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent-600 mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Intelligence Engine Running
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Analyzing Your Opportunity</h2>
          <p className="text-sm text-slate-500">Specialized agents are building your report section by section</p>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Overall Progress</span>
            <span className="text-sm font-bold text-slate-900">{doneCount} / {total} stages</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {doneCount === 0 ? 'Starting up agents...' :
             doneCount === total ? 'Finalizing...' :
             `${pipelineStages.find(s => s.status === 'running')?.label ?? 'Processing'}...`}
          </p>
        </div>

        {/* Stage cards */}
        <div className="space-y-2">
          {pipelineStages.map((s, i) => (
            <div
              key={s.stage}
              className={cn(
                'flex items-center gap-4 rounded-xl border px-5 py-3.5 transition-all duration-300',
                statusColors[s.status],
              )}
            >
              {/* Stage number / icon */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all duration-300',
                iconBg[s.status],
              )}>
                {s.status === 'done'    ? <CheckCircle2 className="w-4 h-4" /> :
                 s.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                 s.status === 'error'   ? <XCircle className="w-4 h-4" /> :
                 <span className="text-xs">{i + 1}</span>}
              </div>

              {/* Agent icon + label */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="opacity-60 flex-shrink-0">{STAGE_ICONS[s.stage]}</span>
                <span className={cn(
                  'text-sm font-semibold truncate',
                  s.status === 'pending' ? 'text-slate-400' : 'text-slate-800',
                )}>
                  {s.label}
                </span>
                {s.status === 'running' && s.attempt && s.attempt > 1 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full flex-shrink-0">
                    Retry {s.attempt}
                  </span>
                )}
              </div>

              {/* Status badge / duration */}
              <div className="flex-shrink-0 text-right">
                {s.status === 'done' && s.duration !== undefined && (
                  <span className="text-xs font-medium text-emerald-600">{formatDuration(s.duration)}</span>
                )}
                {s.status === 'running' && (
                  <span className="text-xs font-semibold text-accent-600 animate-pulse">Running...</span>
                )}
                {s.status === 'pending' && (
                  <span className="text-xs text-slate-300">Waiting</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-xs text-slate-400">
          Each agent calls the AI model independently — this takes 2–4 minutes total.
        </p>
      </div>
    );
  };

  const renderError = () => {
    const isTokenError = !!error && (
      error.toLowerCase().includes('token limit') ||
      error.toLowerCase().includes('tokens used:')
    );
    const tokensUsed = error?.match(/Tokens used:\s*([\d,]+)/i)?.[1];
    const tokensLimit = error?.match(/Model limit:\s*([\d,]+)/i)?.[1];

    return (
      <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          {isTokenError ? 'Input Too Long' : 'Something went wrong'}
        </h3>
        {error && (
          isTokenError ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 max-w-md mx-auto text-left space-y-3">
              <p className="text-sm font-semibold text-amber-800">Token Limit Exceeded</p>
              <p className="text-sm text-amber-700">
                Your problem statement is too long for the AI model to process in a single request.
              </p>
              {(tokensUsed || tokensLimit) && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {tokensUsed && (
                    <div className="bg-white rounded-lg p-2.5 border border-amber-100">
                      <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wide">Tokens Used</p>
                      <p className="text-xl font-extrabold text-amber-700">{tokensUsed}</p>
                    </div>
                  )}
                  {tokensLimit && (
                    <div className="bg-white rounded-lg p-2.5 border border-amber-100">
                      <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wide">Model Limit</p>
                      <p className="text-xl font-extrabold text-amber-700">{tokensLimit}</p>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-amber-600 bg-amber-100 rounded-lg px-3 py-2">
                Tip: Shorten or summarize your problem statement, or split it into smaller sections.
              </p>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-6 max-w-lg mx-auto text-left">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-1">Error Details</p>
              <p className="text-sm text-rose-800 font-mono break-words whitespace-pre-wrap">{error}</p>
            </div>
          )
        )}
        <button
          onClick={() => setPhase('input')}
          className="inline-flex items-center gap-2 bg-accent-600 text-white font-semibold py-2.5 px-5 rounded-xl hover:bg-accent-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  };

  // ─── Phase: INPUT ────────────────────────────────────────────────────

  const renderInputPhase = () => (
    <div>
      {/* Main Form Card */}
      <div className="bg-white rounded-lg relative overflow-hidden shadow-sm">
        {/* Vertical Accent Bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4648d4]" />

        <div className="p-10 space-y-12">

          {/* ── Section 01: Entity Definitions ── */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <span className="w-8 h-8 rounded-full bg-[#dbe2f9] flex items-center justify-center text-[#5c6477] text-xs font-bold flex-shrink-0">
                01
              </span>
              <h3 className="text-xl font-bold">Entity Definitions</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 ml-12">
              {/* Consulting Company */}
              <div className="space-y-2">
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Consulting Company
                </label>
                <input
                  className="w-full bg-[#f1f3ff] border-0 border-b-2 border-transparent focus:border-[#006190] focus:ring-0 focus:bg-white transition-all px-0 py-3 text-[#141b2c] font-medium placeholder:text-slate-300 rounded-none outline-none"
                  placeholder="e.g., Incedo Technology"
                  value={consultingCompany}
                  onChange={e => setConsultingCompany(e.target.value)}
                />
              </div>

              {/* Client Company */}
              <div className="space-y-2">
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Client Company
                </label>
                <input
                  className="w-full bg-[#f1f3ff] border-0 border-b-2 border-transparent focus:border-[#006190] focus:ring-0 focus:bg-white transition-all px-0 py-3 text-[#141b2c] font-medium placeholder:text-slate-300 rounded-none outline-none"
                  placeholder="e.g., Verizon"
                  value={clientCompany}
                  onChange={e => setClientCompany(e.target.value)}
                />
              </div>

              {/* Industry Category — pill selector */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Industry Category
                </label>
                <div className="flex flex-wrap gap-2 pt-2">
                  {INDUSTRY_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setIndustry(opt)}
                      className={cn(
                        'px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors',
                        industry === opt
                          ? 'bg-[#007bb5] text-white'
                          : 'bg-[#dbe2f9] text-[#5c6477] hover:bg-[#007bb5] hover:text-white',
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Section 02: Narrative Core ── */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <span className="w-8 h-8 rounded-full bg-[#dbe2f9] flex items-center justify-center text-[#5c6477] text-xs font-bold flex-shrink-0">
                02
              </span>
              <h3 className="text-xl font-bold">Narrative Core</h3>
            </div>

            <div className="ml-12 space-y-8">
              {/* Problem Statement */}
              <div className="space-y-2">
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Problem or Idea Statement
                </label>
                <textarea
                  className="w-full bg-[#f1f3ff] border-0 border-b-2 border-transparent focus:border-[#006190] focus:ring-0 focus:bg-white transition-all px-0 py-3 text-[#141b2c] font-medium placeholder:text-slate-300 resize-none rounded-none outline-none"
                  rows={5}
                  placeholder="Describe the business problem, opportunity, or idea you want to analyze. Include any relevant context about the client's goals, challenges, and requirements..."
                  value={problemStatement}
                  onChange={e => { setProblemStatement(e.target.value); setUploadedFileName(null); }}
                />
                <p className="text-xs text-slate-400 text-right">{problemStatement.length} characters</p>
              </div>

              {/* Supporting Data — drag-and-drop zone */}
              <div className="space-y-2">
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Supporting Data
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    'w-full border-2 border-dashed rounded-lg p-12 text-center cursor-pointer flex flex-col items-center gap-4 transition-colors',
                    isDragOver
                      ? 'border-[#006190] bg-[#f1f3ff]'
                      : 'border-[#bfc7d1]/50 bg-[#f1f3ff]/30 hover:bg-[#f1f3ff]',
                  )}
                >
                  <div className={cn(
                    'w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm transition-transform',
                    isDragOver && 'scale-110',
                  )}>
                    <Upload className={cn('w-7 h-7', isDragOver ? 'text-[#006190]' : 'text-[#0284c7]')} />
                  </div>
                  <div>
                    {uploadedFileName ? (
                      <>
                        <p className="text-[#141b2c] font-bold">{uploadedFileName}</p>
                        <p className="text-sm text-slate-500 mt-1">Click to replace or drag a new file</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[#141b2c] font-bold">Upload .txt</p>
                        <p className="text-sm text-slate-500 mt-1">Drag and drop raw analytical data or click to browse</p>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[#4648d4] bg-[#4648d4]/10 px-3 py-1 rounded">
                    Max 50MB per file
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </section>

          {/* ── Form Actions ── */}
          <div className="pt-8 border-t border-[#bfc7d1]/20 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-slate-500 font-bold text-xs uppercase tracking-wider hover:text-[#141b2c] transition-colors"
            >
              Discard Draft
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className={cn(
                'px-10 py-4 rounded font-bold tracking-wide flex items-center gap-3 transition-all text-white',
                canAnalyze
                  ? 'bg-gradient-to-br from-[#006190] to-[#007bb5] hover:shadow-[0px_12px_40px_rgba(0,97,144,0.3)] active:scale-95'
                  : 'bg-slate-300 cursor-not-allowed',
              )}
            >
              <span>ANALYZE</span>
              <Zap className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Contextual Insight Footer ── */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[#f1f3ff] rounded-lg">
          <Sparkles className="w-5 h-5 text-[#4648d4] mb-3" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">AI Tip</p>
          <p className="text-sm text-[#3f4850] leading-relaxed">
            Detailed "Problem Statements" result in 40% higher accuracy in capability mapping.
          </p>
        </div>
        <div className="p-6 bg-[#f1f3ff] rounded-lg">
          <ShieldCheck className="w-5 h-5 text-[#006190] mb-3" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Institutional Logic</p>
          <p className="text-sm text-[#3f4850] leading-relaxed">
            All entries are encrypted and cross-referenced against the internal Strategy Ruleset.
          </p>
        </div>
        <div className="p-6 bg-[#f1f3ff] rounded-lg">
          <History className="w-5 h-5 text-[#565e71] mb-3" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Audit Ready</p>
          <p className="text-sm text-[#3f4850] leading-relaxed">
            Uploads are automatically versioned and timestamped for the Admin Panel.
          </p>
        </div>
      </div>
    </div>
  );

  // ─── Phase: REVIEW ───────────────────────────────────────────────────

  // Parse assumptions into an array for per-item editing
  const parseAssumptions = (text: string): string[] => {
    return text.split('\n')
      .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(line => line.length > 0);
  };

  const assumptionsList = parseAssumptions(coreAssumptions);

  const updateAssumption = (index: number, value: string) => {
    const items = parseAssumptions(coreAssumptions);
    items[index] = value;
    setCoreAssumptions(items.map((a, i) => `${i + 1}. ${a}`).join('\n'));
  };

  const removeAssumption = (index: number) => {
    const items = parseAssumptions(coreAssumptions);
    items.splice(index, 1);
    setCoreAssumptions(items.map((a, i) => `${i + 1}. ${a}`).join('\n'));
  };

  const handleReanalyze = async () => {
    setPhase('analyzing');
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated. Please log in again.');
      const res = await fetch('/api/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ input_text: composeInputText() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setCoreAssumptions(data.core_assumptions);
      setPhase('review');
    } catch (err: any) {
      setError(err.message || 'Reanalysis failed.');
      setPhase('error');
    }
  };

  const renderReviewPhase = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <h3 className="text-lg font-bold text-slate-900">Core Assumptions Extracted</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Review each assumption below. Edit inline, remove ones you disagree with, or reanalyze to generate fresh assumptions.
        </p>

        <div className="space-y-3">
          {assumptionsList.map((assumption, i) => (
            <AssumptionRow
              key={i}
              index={i}
              text={assumption}
              onUpdate={(val) => updateAssumption(i, val)}
              onRemove={() => removeAssumption(i)}
            />
          ))}
        </div>

        {assumptionsList.length === 0 && (
          <p className="text-sm text-slate-400 italic text-center py-4">No assumptions — click Reanalyze to generate new ones.</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleApprove}
          disabled={assumptionsList.length === 0}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-5 h-5" />
          APPROVE & GENERATE REPORT
        </button>
        <button
          onClick={handleReanalyze}
          className="flex items-center gap-2 bg-accent-50 text-accent-700 font-semibold py-3 px-5 rounded-xl hover:bg-accent-100 border border-accent-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reanalyze
        </button>
        <button
          onClick={handleReject}
          className="flex items-center gap-2 bg-slate-200 text-slate-700 font-semibold py-3 px-5 rounded-xl hover:bg-slate-300 transition-colors"
        >
          <XCircle className="w-5 h-5" />
          Start Over
        </button>
      </div>
    </div>
  );

  // ─── Phase: RESULT ───────────────────────────────────────────────────

  // ─── Phase: RESULT ───────────────────────────────────────────────────

  const renderResultPhase = () => (
    <div className="space-y-5">
      {/* Compact context + QA status strip */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
        {/* Context pills */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {industry && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-accent-50 text-accent-700 border border-accent-200">
              <Globe className="w-3.5 h-3.5" />{industry}
            </span>
          )}
          {consultingCompany && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">
              <Briefcase className="w-3.5 h-3.5" />{consultingCompany}
            </span>
          )}
          {clientCompany && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">
              <Building2 className="w-3.5 h-3.5" />{clientCompany}
            </span>
          )}
        </div>
        {/* QA status + attempts + reset */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold',
            qaPass
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
          )}>
            {qaPass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            QA: {qaPass ? 'PASS' : 'WARNINGS'}
          </div>
          <span className="text-xs text-slate-400 hidden sm:block">
            {attempts} attempt{attempts !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-600 hover:text-accent-700 px-3 py-1.5 rounded-xl hover:bg-accent-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Analysis
          </button>
        </div>
      </div>

      {/* QA feedback if not passing */}
      {!qaPass && qaFeedback && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-800 break-words">
          <strong>QA Feedback:</strong> {qaFeedback}
        </div>
      )}

      {/* Full-width report */}
      <ReportDashboard markdown={finalOutput} />
    </div>
  );

  // ─── Main render ─────────────────────────────────────────────────────

  return (
    <Layout
      contextIndustry={industry || undefined}
      contextClient={clientCompany || undefined}
      contextCompany={consultingCompany || undefined}
    >
      <div className="mb-10">
        <nav className="mb-8 flex items-center gap-2 text-sm">
          <span className="text-slate-500">Dashboard</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-[#006190] font-semibold">Idea Entry</span>
        </nav>
        <p className="text-xs font-bold uppercase tracking-widest text-[#4648d4] mb-1">Architecture Initialization</p>
        <h1 className="text-4xl font-extrabold text-[#141b2c] tracking-tight">New Strategic Concept</h1>
        <p className="text-slate-500 mt-2 max-w-2xl">Enter the core parameters for your next financial analysis. The Intelligence Engine will process these inputs to generate a comprehensive viability report.</p>
      </div>

      {phase === 'input' && renderInputPhase()}
      {phase === 'analyzing' && renderSpinner('Extracting core assumptions...', 'The Master Agent is analyzing your opportunity canvas.')}
      {phase === 'review' && renderReviewPhase()}
      {phase === 'generating' && renderGeneratingPhase()}
      {phase === 'result' && renderResultPhase()}
      {phase === 'error' && renderError()}
    </Layout>
  );
};
