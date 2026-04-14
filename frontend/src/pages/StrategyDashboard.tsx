import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  Layers2, Globe, Flag,
  ChevronDown, Plus, Trash2, X,
  Info, TrendingUp, ShieldAlert,
  Pencil, Check, Loader2, CloudOff, Upload,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SizingRow {
  id: string;
  size: string;
  capexLimit: string;
  opexLimit: string;
  devDays: string;
  status: 'Standard' | 'Review Req' | 'Strategic';
}

interface ValueStage {
  id: string;
  label: string;
}

interface ValueStream {
  id: string;
  category: string;
  icon: React.ElementType;
  iconColor: string;
  ringColor: string;
  stages: ValueStage[];
}

// ─── Constants & Seed Data ────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  'Standard':   'bg-slate-100 text-slate-600',
  'Review Req': 'bg-amber-100 text-amber-700',
  'Strategic':  'bg-rose-100 text-rose-700',
};

const SEED_SIZING: SizingRow[] = [
  { id: 's1', size: 'X-Small',  capexLimit: '$25,000',    opexLimit: '$5,000',    devDays: '1–5',     status: 'Standard'   },
  { id: 's2', size: 'Small',    capexLimit: '$75,000',    opexLimit: '$15,000',   devDays: '6–15',    status: 'Standard'   },
  { id: 's3', size: 'Medium',   capexLimit: '$200,000',   opexLimit: '$40,000',   devDays: '16–45',   status: 'Standard'   },
  { id: 's4', size: 'Large',    capexLimit: '$500,000',   opexLimit: '$100,000',  devDays: '46–90',   status: 'Review Req' },
  { id: 's5', size: 'X-Large',  capexLimit: '$1,000,000', opexLimit: '$200,000',  devDays: '91–180',  status: 'Strategic'  },
  { id: 's6', size: '2X-Large', capexLimit: '$2,500,000', opexLimit: '$500,000',  devDays: '181–365', status: 'Strategic'  },
  { id: 's7', size: '3X-Large', capexLimit: 'Unlimited',  opexLimit: 'Unlimited', devDays: '365+',    status: 'Strategic'  },
];

const SEED_VALUE_STREAMS: ValueStream[] = [
  {
    id: 'vs1', category: 'Customer Sales', icon: TrendingUp, iconColor: 'text-accent-600', ringColor: 'ring-accent-200',
    stages: [
      { id: 't1', label: 'Lead Gen' },
      { id: 't2', label: 'Qualification' },
      { id: 't3', label: 'Proposal' },
      { id: 't4', label: 'Close' },
    ],
  },
  {
    id: 'vs2', category: 'Post-Sales Service', icon: ShieldAlert, iconColor: 'text-violet-600', ringColor: 'ring-violet-200',
    stages: [
      { id: 't1', label: 'Ticketing' },
      { id: 't2', label: 'Onboarding' },
      { id: 't3', label: 'Support' },
    ],
  },
  {
    id: 'vs3', category: 'Product R&D', icon: Layers2, iconColor: 'text-emerald-600', ringColor: 'ring-emerald-200',
    stages: [
      { id: 't1', label: 'Discovery' },
      { id: 't2', label: 'Prototyping' },
      { id: 't3', label: 'Validation' },
    ],
  },
];

const SEED_STRATEGIC = {
  landscape: `## 2024 Market Realities
* Shift toward AI-first infrastructure
* Margin compression in core legacy sectors
* Regulatory headwinds in EU data sovereignty

### Key Competitor Movements
1. **Nexus Corp:** Aggressive expansion into APAC.
2. **Quantify:** Pivot to modular service mesh.

---
Enter text here to update the underlying strategic model...`,

  priorities: `## Q3-Q4 Objectives
The primary goal is **Efficiency at Scale**. We must prioritize projects that decouple labor growth from revenue growth.

### Priority Pillar 1: Automation
Focus on the top 20% of service tickets that drive 80% of support costs.

### Priority Pillar 2: Intelligence
Embed predictive capabilities into the sales lead qualification engine.

---
Define constraints for AI weighting here...`,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid() { return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`; }

// ─── Sub-components ──────────────────────────────────────────────────────────

const EditableCell: React.FC<{
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  className?: string;
  placeholder?: string;
}> = ({ value, onChange, mono, className, placeholder }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = () => { onChange(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
        className={cn(
          'w-full px-2 py-1 rounded border border-accent-400 ring-2 ring-accent-100 text-sm focus:outline-none bg-white',
          mono && 'font-mono',
          className,
        )}
        placeholder={placeholder}
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      className={cn(
        'group w-full text-left px-1 py-0.5 rounded text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5',
        mono && 'font-mono',
        className,
      )}
    >
      <span className="flex-1 truncate">{value || <span className="text-slate-300 italic">{placeholder ?? 'Click to edit'}</span>}</span>
      <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
    </button>
  );
};

const TagChip: React.FC<{ label: string; onDelete: () => void }> = ({ label, onDelete }) => (
  <span className="group inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-[11px] font-semibold text-slate-600 cursor-default hover:bg-slate-200 transition-colors">
    {label}
    <button
      onClick={onDelete}
      title="Remove stage"
      className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-opacity"
    >
      <X className="w-3 h-3" />
    </button>
  </span>
);

const AddTagInput: React.FC<{ onAdd: (label: string) => void }> = ({ onAdd }) => {
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (active) inputRef.current?.focus(); }, [active]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) { onAdd(trimmed); setDraft(''); }
    setActive(false);
  };

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="px-2 py-0.5 border border-dashed border-slate-300 text-[11px] font-bold rounded text-accent-600 hover:bg-accent-50 transition-colors"
      >
        + Add Stage
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') { setDraft(''); setActive(false); }
      }}
      placeholder="Stage name…"
      className="px-2 py-0.5 rounded text-[11px] border border-accent-400 ring-1 ring-accent-100 focus:outline-none w-24 bg-white"
    />
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const StrategyDashboard: React.FC = () => {
  const { getIdToken } = useAuth();

  // ── Sizing state ──
  const [rows, setRows] = useState<SizingRow[]>(SEED_SIZING);
  const [sizingSaved, setSizingSaved] = useState(false);

  // ── Value streams state ──
  const [streams, setStreams] = useState<ValueStream[]>(SEED_VALUE_STREAMS);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(['vs1']));
  const [vsSaved, setVsSaved] = useState(false);
  const [vsSaving, setVsSaving] = useState(false);
  const [vsLoading, setVsLoading] = useState(true);
  const [vsError, setVsError] = useState<string | null>(null);

  // ── Strategic context state ──
  const [landscape, setLandscape] = useState(SEED_STRATEGIC.landscape);
  const [priorities, setPriorities] = useState(SEED_STRATEGIC.priorities);
  const [strategicView, setStrategicView] = useState<'edit' | 'preview'>('edit');
  const [strategicSaved, setStrategicSaved] = useState(false);
  const landscapeFileRef = useRef<HTMLInputElement>(null);
  const prioritiesFileRef = useRef<HTMLInputElement>(null);

  const makeFileUploadHandler = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    current: string,
    inputRef: React.RefObject<HTMLInputElement | null>,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setter(current ? current + '\n\n' + text : text);
    };
    reader.readAsText(file);
    e.target.value = '';
    inputRef.current && (inputRef.current.value = '');
  };

  // Fetch value streams on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) { setVsLoading(false); return; }
        const res = await fetch('/api/config/value_streams', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const ICON_MAP: Record<string, React.ElementType> = { TrendingUp, ShieldAlert, Layers2 };
            setStreams(data.map((s: any) => ({ ...s, icon: ICON_MAP[s.iconName] || Layers2 })));
          }
        }
      } catch { /* fall back to seed */ }
      finally { setVsLoading(false); }
    })();
  }, []);

  // ── Sizing handlers ──
  const updateRow = (id: string, field: keyof SizingRow, value: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

  const handleSizingSave = () => { setSizingSaved(true); setTimeout(() => setSizingSaved(false), 2000); };

  // ── Value stream handlers ──
  const toggleOpen = (id: string) =>
    setOpenIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const addStage = (streamId: string, label: string) =>
    setStreams(prev => prev.map(s =>
      s.id === streamId ? { ...s, stages: [...s.stages, { id: uid(), label }] } : s,
    ));

  const deleteStage = (streamId: string, stageId: string) =>
    setStreams(prev => prev.map(s =>
      s.id === streamId ? { ...s, stages: s.stages.filter(t => t.id !== stageId) } : s,
    ));

  const deleteStream = (id: string) => setStreams(prev => prev.filter(s => s.id !== id));

  const addStream = () => {
    const ns: ValueStream = {
      id: uid(), category: 'New Category',
      icon: Layers2, iconColor: 'text-slate-500', ringColor: 'ring-slate-200',
      stages: [],
    };
    setStreams(prev => [...prev, ns]);
    setOpenIds(prev => new Set([...prev, ns.id]));
  };

  const ICON_NAME_MAP = new Map<React.ElementType, string>([
    [TrendingUp, 'TrendingUp'], [ShieldAlert, 'ShieldAlert'], [Layers2, 'Layers2'],
  ]);

  const handleVsSave = async () => {
    setVsSaving(true); setVsError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');
      const payload = streams.map(s => ({ ...s, iconName: ICON_NAME_MAP.get(s.icon) || 'Layers2', icon: undefined }));
      const res = await fetch('/api/config/value_streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setVsSaved(true); setTimeout(() => setVsSaved(false), 2000);
    } catch (err: any) {
      setVsError(err.message || 'Failed to save');
    } finally { setVsSaving(false); }
  };

  // ── Strategic handlers ──
  const handleStrategicSave = () => { setStrategicSaved(true); setTimeout(() => setStrategicSaved(false), 2000); };

  const renderMarkdown = (md: string) =>
    md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-slate-700 mt-4 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-slate-800 mt-5 mb-2 pb-1 border-b border-slate-100">$1</h2>')
      .replace(/^# (.+)$/gm,  '<h1 class="text-lg font-bold text-slate-900 mt-5 mb-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^---$/gm, '<hr class="border-slate-200 my-3" />')
      .replace(/^[*\-] (.+)$/gm, '<li class="text-sm text-slate-600 ml-4 list-disc">$1</li>')
      .replace(/^(?!<[hul])(.+)$/gm, line => line.trim() ? `<p class="text-sm text-slate-600 my-0.5">${line}</p>` : '');

  return (
    <Layout>
      {/* ── Page header ── */}
      <div className="mb-10">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Governance Framework</span>
        <h2 className="text-3xl md:text-4xl font-display font-extrabold text-slate-900 tracking-tight mt-1 mb-2">
          Strategy &amp; Rules
        </h2>
        <p className="text-slate-500 max-w-2xl leading-relaxed text-sm">
          Define the architectural boundaries of the intelligence engine. Configure effort sizing thresholds,
          manage value stream stages, and establish strategic landscape context.
        </p>
      </div>

      {/* ── Dashboard Grid ── */}
      <div className="grid grid-cols-12 gap-8">

        {/* ── 1. Effort Sizing Matrix (8 cols) ── */}
        <section className="col-span-12 lg:col-span-8 bg-white rounded-xl p-8 relative overflow-hidden hover:-translate-y-0.5 transition-transform shadow-sm">
          {/* Left accent bar */}
          <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-600 rounded-l-xl" />

          <div className="flex items-center justify-between mb-8 pl-3">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-violet-600 uppercase">Resource Allocation</span>
              <h3 className="text-2xl font-display font-bold text-slate-900 mt-0.5">Effort Sizing Matrix</h3>
            </div>
            <button
              onClick={handleSizingSave}
              aria-label="Update sizing matrix"
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all active:scale-95 text-white',
                sizingSaved ? 'bg-emerald-500' : 'bg-gradient-to-br from-accent-700 to-accent-500',
              )}
            >
              {sizingSaved
                ? <><Check className="w-4 h-4" /> Saved</>
                : <><Pencil className="w-4 h-4" /> Update Matrix</>}
            </button>
          </div>

          <div className="overflow-x-auto pl-3">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                  <th className="pb-4 px-4">Size Category</th>
                  <th className="pb-4 px-4 text-right">Capex Cap ($)</th>
                  <th className="pb-4 px-4 text-right">Opex Cap ($)</th>
                  <th className="pb-4 px-4 text-center">Dev Cycle (Days)</th>
                  <th className="pb-4 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-50">
                {rows.map(row => (
                  <tr key={row.id} className="group hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 font-semibold text-slate-800">{row.size}</td>
                    <td className="py-4 px-4 text-right tabular-nums text-slate-500">
                      <EditableCell value={row.capexLimit} onChange={v => updateRow(row.id, 'capexLimit', v)} mono placeholder="e.g. $200,000" />
                    </td>
                    <td className="py-4 px-4 text-right tabular-nums text-slate-500">
                      <EditableCell value={row.opexLimit} onChange={v => updateRow(row.id, 'opexLimit', v)} mono placeholder="e.g. $40,000" />
                    </td>
                    <td className="py-4 px-4 text-center text-slate-500">
                      <EditableCell value={row.devDays} onChange={v => updateRow(row.id, 'devDays', v)} mono placeholder="e.g. 16–45" />
                    </td>
                    <td className="py-4 px-4">
                      <span className={cn('px-3 py-1 text-[11px] font-bold rounded-full uppercase', STATUS_STYLES[row.status] ?? 'bg-slate-100 text-slate-600')}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 2. Value Streams sidebar (4 cols) ── */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          {/* Value streams card */}
          <div className="bg-white rounded-xl p-8 border border-slate-200/60 shadow-sm">
            <div className="mb-6">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Taxonomy Engine</span>
              <h3 className="text-xl font-display font-bold text-slate-900 mt-0.5">Value Streams</h3>
              {vsError && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-600">
                  <CloudOff className="w-3.5 h-3.5" /> {vsError}
                </div>
              )}
            </div>

            {vsLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Loading...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {streams.map(stream => {
                  const Icon = stream.icon;
                  const isOpen = openIds.has(stream.id);
                  return (
                    <div key={stream.id} className="group border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <button
                        className="flex items-center justify-between w-full text-left mb-3"
                        onClick={() => toggleOpen(stream.id)}
                      >
                        <span className="text-sm font-bold text-slate-800">{stream.category}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); deleteStream(stream.id); }}
                            title="Delete stream"
                            className="p-1 rounded opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform duration-200', isOpen ? 'rotate-0' : '-rotate-90')} />
                        </div>
                      </button>
                      {isOpen && (
                        <div className="flex flex-wrap gap-2 items-center">
                          {stream.stages.map(stage => (
                            <TagChip key={stage.id} label={stage.label} onDelete={() => deleteStage(stream.id, stage.id)} />
                          ))}
                          <AddTagInput onAdd={label => addStage(stream.id, label)} />
                        </div>
                      )}
                      {isOpen && stream.stages.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No stages yet — add one above.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-2 mt-8">
              <button
                onClick={addStream}
                className="w-full py-3 text-sm font-bold text-accent-600 border-2 border-accent-200 rounded-lg hover:bg-accent-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Define New Value Stream
              </button>
              <button
                onClick={handleVsSave}
                disabled={vsSaving}
                className={cn(
                  'w-full py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
                  vsSaved ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  vsSaving && 'opacity-60 cursor-not-allowed',
                )}
              >
                {vsSaving
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                  : vsSaved
                    ? <><Check className="w-3.5 h-3.5" /> Saved to Cloud</>
                    : 'Save to Cloud'}
              </button>
            </div>
          </div>

          {/* Governance Tip dark card */}
          <div className="bg-slate-900 rounded-xl p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <Info className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-bold text-sm">Governance Tip</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Changes to effort sizing categories will automatically recalibrate existing project ROI
              predictions in the Intelligence Hub. Use with caution.
            </p>
          </div>
        </div>

        {/* ── 3. Strategic Context (full width) ── */}
        <section className="col-span-12">
          <div className="bg-white rounded-xl p-8 overflow-hidden shadow-sm">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Narrative Framework</span>
                <h3 className="text-2xl font-display font-bold text-slate-900 mt-0.5">Strategic Context</h3>
              </div>
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setStrategicView('edit')}
                  className={cn(
                    'px-4 py-2 text-xs font-bold rounded-md transition-colors',
                    strategicView === 'edit' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  Markdown Editor
                </button>
                <button
                  onClick={() => setStrategicView('preview')}
                  className={cn(
                    'px-4 py-2 text-xs font-bold rounded-md transition-colors',
                    strategicView === 'preview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  Live Preview
                </button>
              </div>
            </div>

            {/* Two-column editors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Market Landscape */}
              <div className="space-y-4">
                <input
                  ref={landscapeFileRef}
                  type="file"
                  accept=".txt,.md,.markdown"
                  aria-label="Upload landscape file"
                  className="hidden"
                  onChange={makeFileUploadHandler(setLandscape, landscape, landscapeFileRef)}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-accent-600">
                    <Globe className="w-5 h-5" />
                    <h4 className="text-sm font-bold uppercase tracking-tight">Market Landscape</h4>
                  </div>
                  <button
                    onClick={() => landscapeFileRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                    title="Upload .txt or .md file"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </button>
                </div>
                {strategicView === 'edit' ? (
                  <textarea
                    value={landscape}
                    onChange={e => setLandscape(e.target.value)}
                    rows={12}
                    aria-label="Market landscape markdown editor"
                    placeholder="Describe the current market landscape, technology trends, and competitive dynamics…"
                    className="w-full bg-slate-50 border-none rounded-lg p-5 text-sm font-mono text-slate-600 focus:ring-2 focus:ring-accent-200 focus:bg-white transition-all leading-relaxed resize-none focus:outline-none custom-scrollbar"
                    spellCheck={false}
                  />
                ) : (
                  <div
                    className="w-full bg-slate-50 rounded-lg p-5 min-h-[16rem] text-sm leading-relaxed overflow-y-auto custom-scrollbar"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(landscape) }}
                  />
                )}
              </div>

              {/* Strategic Priorities */}
              <div className="space-y-4">
                <input
                  ref={prioritiesFileRef}
                  type="file"
                  accept=".txt,.md,.markdown"
                  aria-label="Upload priorities file"
                  className="hidden"
                  onChange={makeFileUploadHandler(setPriorities, priorities, prioritiesFileRef)}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-violet-600">
                    <Flag className="w-5 h-5" />
                    <h4 className="text-sm font-bold uppercase tracking-tight">Strategic Priorities</h4>
                  </div>
                  <button
                    onClick={() => prioritiesFileRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                    title="Upload .txt or .md file"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </button>
                </div>
                {strategicView === 'edit' ? (
                  <textarea
                    value={priorities}
                    onChange={e => setPriorities(e.target.value)}
                    rows={12}
                    aria-label="Strategic priorities markdown editor"
                    placeholder="Describe the organisation's top strategic priorities, OKRs, and investment themes…"
                    className="w-full bg-slate-50 border-none rounded-lg p-5 text-sm font-mono text-slate-600 focus:ring-2 focus:ring-violet-200 focus:bg-white transition-all leading-relaxed resize-none focus:outline-none custom-scrollbar"
                    spellCheck={false}
                  />
                ) : (
                  <div
                    className="w-full bg-slate-50 rounded-lg p-5 min-h-[16rem] text-sm leading-relaxed overflow-y-auto custom-scrollbar"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(priorities) }}
                  />
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="mt-10 flex justify-end gap-4">
              <button
                onClick={() => { setLandscape(SEED_STRATEGIC.landscape); setPriorities(SEED_STRATEGIC.priorities); }}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Discard Draft
              </button>
              <button
                onClick={handleStrategicSave}
                className={cn(
                  'px-8 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-white',
                  strategicSaved ? 'bg-emerald-500 shadow-emerald-200' : 'bg-gradient-to-br from-accent-700 to-accent-500 shadow-sky-200',
                )}
              >
                {strategicSaved
                  ? <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Published</span>
                  : 'Publish New Framework'}
              </button>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
};
