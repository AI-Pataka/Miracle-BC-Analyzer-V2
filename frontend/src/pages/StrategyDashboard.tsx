import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  SlidersHorizontal, Layers2, BookOpenText,
  ChevronDown, Plus, Trash2, X,
  Save, RotateCcw, Info, TrendingUp, ShieldAlert,
  DollarSign, Clock, Pencil, Check, Upload, Loader2, CloudOff,
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
}

interface ValueStage {
  id: string;
  label: string;
  color: string;
}

interface ValueStream {
  id: string;
  category: string;
  icon: React.ElementType;
  iconColor: string;
  ringColor: string;
  stages: ValueStage[];
}

type Tab = 'sizing' | 'valuestreams' | 'strategic';

// ─── Constants & Seed Data ────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'sizing',        label: 'Effort Sizing Matrix',          icon: SlidersHorizontal, desc: 'T-shirt size → cost & time bounds'   },
  { id: 'valuestreams',  label: 'Value Stream Definitions',      icon: Layers2,            desc: 'Category → stage taxonomy'           },
  { id: 'strategic',     label: 'Strategic Context',             icon: BookOpenText,       desc: 'SWOT / Porter\'s reference inputs'   },
];

const SIZE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  'X-Small':  { bg: 'bg-slate-50',   text: 'text-slate-600',   ring: 'ring-slate-200'  },
  'Small':    { bg: 'bg-sky-50',     text: 'text-sky-700',     ring: 'ring-sky-200'    },
  'Medium':   { bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200'   },
  'Large':    { bg: 'bg-violet-50',  text: 'text-violet-700',  ring: 'ring-violet-200' },
  'X-Large':  { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200'  },
  '2X-Large': { bg: 'bg-orange-50',  text: 'text-orange-700',  ring: 'ring-orange-200' },
  '3X-Large': { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200'   },
};

const SEED_SIZING: SizingRow[] = [
  { id: 's1', size: 'X-Small',  capexLimit: '$25,000',    opexLimit: '$5,000',    devDays: '1–5'   },
  { id: 's2', size: 'Small',    capexLimit: '$75,000',    opexLimit: '$15,000',   devDays: '6–15'  },
  { id: 's3', size: 'Medium',   capexLimit: '$200,000',   opexLimit: '$40,000',   devDays: '16–45' },
  { id: 's4', size: 'Large',    capexLimit: '$500,000',   opexLimit: '$100,000',  devDays: '46–90' },
  { id: 's5', size: 'X-Large',  capexLimit: '$1,000,000', opexLimit: '$200,000',  devDays: '91–180'},
  { id: 's6', size: '2X-Large', capexLimit: '$2,500,000', opexLimit: '$500,000',  devDays: '181–365'},
  { id: 's7', size: '3X-Large', capexLimit: 'Unlimited',  opexLimit: 'Unlimited', devDays: '365+'  },
];

const TAG_PALETTES = [
  { bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-300' },
  { bg: 'bg-blue-100',   text: 'text-blue-700',   ring: 'ring-blue-300'   },
  { bg: 'bg-emerald-100',text: 'text-emerald-700',ring: 'ring-emerald-300'},
  { bg: 'bg-amber-100',  text: 'text-amber-700',  ring: 'ring-amber-300'  },
  { bg: 'bg-rose-100',   text: 'text-rose-700',   ring: 'ring-rose-300'   },
  { bg: 'bg-sky-100',    text: 'text-sky-700',    ring: 'ring-sky-300'    },
  { bg: 'bg-fuchsia-100',text: 'text-fuchsia-700',ring: 'ring-fuchsia-300'},
  { bg: 'bg-teal-100',   text: 'text-teal-700',   ring: 'ring-teal-300'   },
];

function palette(idx: number) { return TAG_PALETTES[idx % TAG_PALETTES.length]; }

const SEED_VALUE_STREAMS: ValueStream[] = [
  {
    id: 'vs1', category: 'Sales', icon: TrendingUp, iconColor: 'text-blue-600', ringColor: 'ring-blue-200',
    stages: [
      { id: 't1', label: 'Learn',   color: '' },
      { id: 't2', label: 'Buy',     color: '' },
      { id: 't3', label: 'Get',     color: '' },
      { id: 't4', label: 'Use',     color: '' },
      { id: 't5', label: 'Pay',     color: '' },
      { id: 't6', label: 'Support', color: '' },
    ],
  },
  {
    id: 'vs2', category: 'Service', icon: ShieldAlert, iconColor: 'text-violet-600', ringColor: 'ring-violet-200',
    stages: [
      { id: 't1', label: 'Request',   color: '' },
      { id: 't2', label: 'Diagnose',  color: '' },
      { id: 't3', label: 'Resolve',   color: '' },
      { id: 't4', label: 'Follow-Up', color: '' },
      { id: 't5', label: 'Close',     color: '' },
    ],
  },
  {
    id: 'vs3', category: 'Validation', icon: Check, iconColor: 'text-emerald-600', ringColor: 'ring-emerald-200',
    stages: [
      { id: 't1', label: 'Identify',  color: '' },
      { id: 't2', label: 'Verify',    color: '' },
      { id: 't3', label: 'Approve',   color: '' },
      { id: 't4', label: 'Certify',   color: '' },
    ],
  },
  {
    id: 'vs4', category: 'Outbound', icon: TrendingUp, iconColor: 'text-amber-600', ringColor: 'ring-amber-200',
    stages: [
      { id: 't1', label: 'Segment',   color: '' },
      { id: 't2', label: 'Target',    color: '' },
      { id: 't3', label: 'Engage',    color: '' },
      { id: 't4', label: 'Convert',   color: '' },
      { id: 't5', label: 'Retain',    color: '' },
    ],
  },
];

const SEED_STRATEGIC = {
  landscape: `## Current Telecom Strategic Landscape

### 5G & Network Evolution
- Nationwide 5G rollout reaching 85% population coverage by EOY
- Network slicing enabling enterprise B2B revenue streams
- Open RAN deployments reducing vendor lock-in and TCO

### Fixed-Wireless Access (FWA)
- FWA positioned as cable-replacement in underserved markets
- Target: 2M FWA subscribers within 24 months

### Convergence & Bundling
- Fixed + Mobile convergence bundles driving ARPU uplift
- Smart Home as an anchor product for retention

### AI & Automation
- Network AI for predictive maintenance reducing MTTR by 30%
- GenAI-assisted customer service (deflection target: 40%)

### Competitive Pressures
- MVNOs intensifying pricing pressure in prepaid segment
- Cable operators (MSOs) expanding wireless footprint via CBRS
- BigTech (Apple, Google) exploring eSIM-native journeys`,

  priorities: `## Corporate Priorities

### Churn Reduction (Priority 1)
- Reduce postpaid churn from 1.4% → 0.9% MoM
- Focus on high-value segments: 5G early adopters, SMB
- Personalised retention offers powered by ML propensity models

### Cost Takeout (Priority 2)
- $500M opex reduction target over 3 years
- Automate 60% of tier-1 customer service interactions
- Network operations headcount rationalisation via AI Ops

### Revenue Growth (Priority 3)
- Grow enterprise revenue 18% YoY through SD-WAN and IoT
- Digital channel penetration: 70% of sales via self-serve by EOY
- Upsell 5G Home Internet to existing mobility customers

### Digital Transformation (Priority 4)
- Legacy OSS/BSS modernisation (Pega, Salesforce deployment)
- API-first architecture enabling partner ecosystem
- Real-time data platform (Snowflake + Kafka) for decisioning

### ESG & Brand (Priority 5)
- Net-zero network by 2040 commitment
- Digital inclusion: subsidised connectivity for low-income households`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`; }

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Inline-editable cell */
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
        'group w-full text-left px-2 py-1 rounded text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5',
        mono && 'font-mono',
        className,
      )}
    >
      <span className="flex-1 truncate">{value || <span className="text-slate-300 italic">{placeholder ?? 'Click to edit'}</span>}</span>
      <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
    </button>
  );
};

/** Editable tag chip */
const TagChip: React.FC<{
  label: string;
  paletteIdx: number;
  onRename: (v: string) => void;
  onDelete: () => void;
}> = ({ label, paletteIdx, onRename, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);
  const p = palette(paletteIdx);

  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onRename(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(label); setEditing(false); }
        }}
        className={cn(
          'px-2 py-0.5 rounded-full text-xs font-semibold ring-1 border-0 focus:outline-none w-24',
          p.bg, p.text, p.ring,
        )}
      />
    );
  }

  return (
    <span className={cn('group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 cursor-pointer select-none', p.bg, p.text, p.ring)}>
      <span onDoubleClick={() => setEditing(true)} title="Double-click to rename">{label}</span>
      <button
        onClick={onDelete}
        className="ml-0.5 rounded-full opacity-40 group-hover:opacity-100 hover:text-red-600 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
};

/** New-tag inline adder */
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
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-400 ring-1 ring-slate-200 ring-dashed hover:ring-accent-400 hover:text-accent-600 transition-colors"
      >
        <Plus className="w-3 h-3" /> Add stage
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
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
        className="px-2 py-0.5 rounded-full text-xs border border-accent-400 ring-2 ring-accent-100 focus:outline-none w-28 bg-white"
      />
    </span>
  );
};

// ─── Tab 1: Effort Sizing Matrix ──────────────────────────────────────────────

const SizingMatrixTab: React.FC = () => {
  const [rows, setRows] = useState<SizingRow[]>(SEED_SIZING);
  const [saved, setSaved] = useState(false);

  const update = (id: string, field: keyof SizingRow, value: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

  const addRow = () =>
    setRows(prev => [...prev, { id: uid(), size: 'New Size', capexLimit: '', opexLimit: '', devDays: '' }]);

  const deleteRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const handleReset = () => setRows(SEED_SIZING);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h2 className="text-lg font-display font-bold text-slate-800">Effort Sizing Matrix</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Map T-shirt sizes to financial and time constraints. Used as reference bounds during capability impact assessment.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={handleSave}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all',
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-accent-600 hover:bg-accent-700 text-white',
            )}
          >
            {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save Changes</>}
          </button>
        </div>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-6 text-sm text-blue-700">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
        <span>Click any cell to edit inline. Press <kbd className="px-1.5 py-0.5 bg-white border border-blue-200 rounded text-xs font-mono">Enter</kbd> to confirm or <kbd className="px-1.5 py-0.5 bg-white border border-blue-200 rounded text-xs font-mono">Esc</kbd> to cancel.</span>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Header row */}
        <div className="grid grid-cols-[120px_1fr_1fr_1fr_44px] md:grid-cols-[200px_1fr_1fr_1fr_44px] bg-slate-50 border-b border-slate-200">
          {[
            { icon: null,        label: 'Size',             sub: 'T-shirt classification' },
            { icon: DollarSign,  label: 'Capex Limit',      sub: 'Capital expenditure ceiling' },
            { icon: DollarSign,  label: 'Opex Limit',       sub: 'Operating expenditure ceiling' },
            { icon: Clock,       label: 'Development Days', sub: 'Estimated delivery range' },
          ].map((col, i) => (
            <div key={i} className="px-4 py-3 border-r border-slate-200 last:border-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                {col.icon && <col.icon className="w-3.5 h-3.5 text-slate-400" />}
                {col.label}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{col.sub}</div>
            </div>
          ))}
          <div className="px-2 py-3" />
        </div>

        {/* Data rows */}
        {rows.map((row, idx) => {
          const sc = SIZE_COLORS[row.size] ?? { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-200' };
          return (
            <div
              key={row.id}
              className={cn(
                'grid grid-cols-[120px_1fr_1fr_1fr_44px] md:grid-cols-[200px_1fr_1fr_1fr_44px] border-b border-slate-100 last:border-0 group hover:bg-slate-50/50 transition-colors',
                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30',
              )}
            >
              {/* Size badge cell */}
              <div className="px-3 py-3 border-r border-slate-100 flex items-center">
                <span className={cn(
                  'inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ring-1 w-full justify-center',
                  sc.bg, sc.text, sc.ring,
                )}>
                  {row.size}
                </span>
              </div>

              <div className="px-2 py-2 border-r border-slate-100 flex items-center">
                <EditableCell value={row.capexLimit} onChange={v => update(row.id, 'capexLimit', v)} mono placeholder="e.g. $200,000" className="text-slate-700" />
              </div>
              <div className="px-2 py-2 border-r border-slate-100 flex items-center">
                <EditableCell value={row.opexLimit} onChange={v => update(row.id, 'opexLimit', v)} mono placeholder="e.g. $40,000" className="text-slate-700" />
              </div>
              <div className="px-2 py-2 border-r border-slate-100 flex items-center">
                <EditableCell value={row.devDays} onChange={v => update(row.id, 'devDays', v)} mono placeholder="e.g. 16–45" className="text-slate-700" />
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={() => deleteRow(row.id)}
                  className="p-1.5 rounded opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                  title="Remove row"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add row */}
      <button
        onClick={addRow}
        className="mt-3 flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-accent-600 hover:bg-accent-50 rounded-lg border border-dashed border-slate-200 hover:border-accent-300 w-full justify-center transition-colors"
      >
        <Plus className="w-4 h-4" /> Add Size Tier
      </button>
    </div>
  );
};

// ─── Tab 2: Value Stream Definitions ─────────────────────────────────────────

const ValueStreamsTab: React.FC = () => {
  const { getIdToken } = useAuth();
  const [streams, setStreams] = useState<ValueStream[]>(SEED_VALUE_STREAMS);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(['vs1']));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Fetch value streams from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) { setLoading(false); return; }
        const res = await fetch('/api/config/value_streams', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Restore icon references (icons can't be serialized)
            const ICON_MAP: Record<string, React.ElementType> = {
              TrendingUp, ShieldAlert, Check, Layers2,
            };
            const restored = data.map((s: any) => ({
              ...s,
              icon: ICON_MAP[s.iconName] || Layers2,
            }));
            setStreams(restored);
          }
        }
      } catch {
        // Silently fall back to seed data
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleOpen = (id: string) =>
    setOpenIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const addStage = (streamId: string, label: string) =>
    setStreams(prev => prev.map(s =>
      s.id === streamId
        ? { ...s, stages: [...s.stages, { id: uid(), label, color: '' }] }
        : s,
    ));

  const renameStage = (streamId: string, stageId: string, label: string) =>
    setStreams(prev => prev.map(s =>
      s.id === streamId
        ? { ...s, stages: s.stages.map(t => t.id === stageId ? { ...t, label } : t) }
        : s,
    ));

  const deleteStage = (streamId: string, stageId: string) =>
    setStreams(prev => prev.map(s =>
      s.id === streamId
        ? { ...s, stages: s.stages.filter(t => t.id !== stageId) }
        : s,
    ));

  const addStream = () => {
    const newStream: ValueStream = {
      id: uid(), category: 'New Category',
      icon: Layers2, iconColor: 'text-slate-500', ringColor: 'ring-slate-200',
      stages: [],
    };
    setStreams(prev => [...prev, newStream]);
    setOpenIds(prev => new Set([...prev, newStream.id]));
  };

  const deleteStream = (id: string) => setStreams(prev => prev.filter(s => s.id !== id));

  const renameStream = (id: string, name: string) =>
    setStreams(prev => prev.map(s => s.id === id ? { ...s, category: name } : s));

  // Map icon components to serializable names
  const ICON_NAME_MAP = new Map<React.ElementType, string>([
    [TrendingUp, 'TrendingUp'],
    [ShieldAlert, 'ShieldAlert'],
    [Check, 'Check'],
    [Layers2, 'Layers2'],
  ]);

  const handleSave = async () => {
    setSaving(true);
    setCloudError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');
      // Serialize: replace icon component with iconName string
      const payload = streams.map(s => ({
        ...s,
        iconName: ICON_NAME_MAP.get(s.icon) || 'Layers2',
        icon: undefined,
      }));
      const res = await fetch('/api/config/value_streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setCloudError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading value streams...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-800">Value Stream Definitions</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Define the taxonomy of value stream categories and their constituent stages. Used to classify journey steps and capability impact.
          </p>
          {cloudError && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-600">
              <CloudOff className="w-3.5 h-3.5" /> {cloudError}
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all',
            saved ? 'bg-emerald-500 text-white' : 'bg-accent-600 hover:bg-accent-700 text-white',
            saving && 'opacity-60 cursor-not-allowed',
          )}
        >
          {saving ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
          ) : saved ? (
            <><Check className="w-3.5 h-3.5" /> Saved</>
          ) : (
            <><Save className="w-3.5 h-3.5" /> Save to Cloud</>
          )}
        </button>
      </div>

      <div className="space-y-3">
        {streams.map((stream, sIdx) => {
          const isOpen = openIds.has(stream.id);
          const Icon = stream.icon;
          return (
            <div key={stream.id} className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Accordion header */}
              <div
                className={cn(
                  'flex items-center gap-3 px-5 py-4 cursor-pointer select-none transition-colors group',
                  isOpen ? 'bg-white border-b border-slate-100' : 'bg-slate-50 hover:bg-white',
                )}
                onClick={() => toggleOpen(stream.id)}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center ring-1 bg-white flex-shrink-0', stream.ringColor)}>
                  <Icon className={cn('w-4 h-4', stream.iconColor)} />
                </div>

                <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                  <EditableCell
                    value={stream.category}
                    onChange={v => renameStream(stream.id, v)}
                    className="text-base font-semibold text-slate-800 py-0"
                    placeholder="Category name"
                  />
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-400">{stream.stages.length} stage{stream.stages.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteStream(stream.id); }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className={cn('transition-transform duration-200', isOpen ? 'rotate-0' : '-rotate-90')}>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Accordion body */}
              {isOpen && (
                <div className="px-5 py-4 bg-white">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stages</span>
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-xs text-slate-400">Double-click a tag to rename</span>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {stream.stages.map((stage, tIdx) => (
                      <TagChip
                        key={stage.id}
                        label={stage.label}
                        paletteIdx={sIdx * 8 + tIdx}
                        onRename={v => renameStage(stream.id, stage.id, v)}
                        onDelete={() => deleteStage(stream.id, stage.id)}
                      />
                    ))}
                    <AddTagInput onAdd={label => addStage(stream.id, label)} />
                  </div>
                  {stream.stages.length === 0 && (
                    <p className="text-xs text-slate-400 italic mt-1">No stages defined yet — add one above.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={addStream}
        className="mt-4 flex items-center gap-2 px-4 py-3 text-sm text-slate-500 hover:text-accent-600 hover:bg-accent-50 rounded-xl border border-dashed border-slate-200 hover:border-accent-300 w-full justify-center transition-colors font-medium"
      >
        <Plus className="w-4 h-4" /> Add Value Stream Category
      </button>
    </div>
  );
};

// ─── Tab 3: Strategic Context ─────────────────────────────────────────────────

const MarkdownEditor: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ title, subtitle, icon: Icon, iconBg, iconColor, value, onChange, placeholder }) => {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Minimal markdown → HTML renderer (headings, bold, italic, lists, hr)
  const renderMarkdown = (md: string): string => {
    return md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-slate-700 mt-4 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-slate-800 mt-5 mb-2 pb-1 border-b border-slate-100">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-slate-900 mt-5 mb-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^---$/gm, '<hr class="border-slate-200 my-3" />')
      .replace(/^- (.+)$/gm, '<li class="flex gap-1.5 text-sm text-slate-600"><span class="text-accent-500 mt-0.5 flex-shrink-0">•</span><span>$1</span></li>')
      .replace(/(<li.*<\/li>\n?)+/g, '<ul class="space-y-0.5 ml-1 my-1">$&</ul>')
      .replace(/^(?!<[hul])(.+)$/gm, (line) =>
        line.trim() ? `<p class="text-sm text-slate-600 my-0.5">${line}</p>` : '',
      );
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      onChange(value ? value + '\n\n' + text : text);
    };
    reader.readAsText(file);
    // Reset so the same file can be re-uploaded
    e.target.value = '';
  };

  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col h-full border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Card header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-start gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ring-1', iconBg)}>
            <Icon className={cn('w-4 h-4', iconColor)} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">{title}</div>
            <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleFileUpload}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors flex items-center gap-1"
            title="Upload .txt or .md file"
          >
            <Upload className="w-3 h-3" /> Upload
          </button>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <button
            onClick={() => setPreview(false)}
            className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors', !preview ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100')}
          >
            Edit
          </button>
          <button
            onClick={() => setPreview(true)}
            className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors', preview ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100')}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 relative">
        {preview ? (
          <div
            className="h-full overflow-y-auto p-5 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="absolute inset-0 w-full h-full p-5 text-sm text-slate-700 font-mono leading-relaxed resize-none focus:outline-none bg-white placeholder-slate-300"
            spellCheck={false}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
        <span>Markdown supported</span>
        <span>{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};

const StrategicContextTab: React.FC = () => {
  const [landscape, setLandscape] = useState(SEED_STRATEGIC.landscape);
  const [priorities, setPriorities] = useState(SEED_STRATEGIC.priorities);
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const handleReset = () => { setLandscape(SEED_STRATEGIC.landscape); setPriorities(SEED_STRATEGIC.priorities); };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-shrink-0">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-800">Strategic Context</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Ground the BA-lite engine in the current strategic landscape. These inputs inform SWOT framing and Porter's Five Forces analysis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={handleSave}
            className={cn('flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all', saved ? 'bg-emerald-500 text-white' : 'bg-accent-600 hover:bg-accent-700 text-white')}
          >
            {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save Changes</>}
          </button>
        </div>
      </div>

      {/* Side-by-side editors — fixed height */}
      <div className="grid grid-cols-2 gap-5 flex-1 min-h-0" style={{ height: 'calc(100vh - 340px)' }}>
        <MarkdownEditor
          title="Telecom Strategic Landscape"
          subtitle="5G, Convergence, Competitive pressures"
          icon={TrendingUp}
          iconBg="bg-blue-50 ring-blue-200"
          iconColor="text-blue-600"
          value={landscape}
          onChange={setLandscape}
          placeholder="Describe the current telecom market landscape, technology trends, and competitive dynamics…"
        />
        <MarkdownEditor
          title="Corporate Priorities"
          subtitle="Churn reduction, Cost takeout, Growth"
          icon={ShieldAlert}
          iconBg="bg-violet-50 ring-violet-200"
          iconColor="text-violet-600"
          value={priorities}
          onChange={setPriorities}
          placeholder="Describe the organisation's top strategic priorities, OKRs, and investment themes…"
        />
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const StrategyDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('sizing');

  return (
    <Layout>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-start gap-3 mb-1">
          <div className="w-9 h-9 bg-accent-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <SlidersHorizontal className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-display font-bold text-slate-900">Strategy & Rules Engine</h1>
            <p className="text-sm text-slate-500">Evaluation rules, sizing frameworks, and strategic context for the BA-lite engine</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-8 bg-slate-100 p-1 rounded-xl">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
                active
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-accent-600' : 'text-slate-400')} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Tab description strip */}
      <div className="flex items-center gap-2 mb-6 text-xs text-slate-400">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
        {TABS.find(t => t.id === activeTab)?.desc}
      </div>

      {/* Tab content */}
      <div className={cn(activeTab === 'strategic' ? 'flex flex-col' : '')}>
        {activeTab === 'sizing'       && <SizingMatrixTab />}
        {activeTab === 'valuestreams' && <ValueStreamsTab />}
        {activeTab === 'strategic'    && <StrategicContextTab />}
      </div>
    </Layout>
  );
};
