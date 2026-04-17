import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot, Cpu, Layers, Route, Server, DollarSign, ShieldQuestion,
  Save, RotateCcw, Check, Loader2, AlertCircle, Eye, EyeOff, Key,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { listAgentConfigs, saveAgentConfig } from '../lib/apiClient';
import type { AgentConfigPublic, AgentName, LLMProvider } from '../types';

interface AgentMeta {
  name: AgentName;
  label: string;
  description: string;
  icon: React.ElementType;
}

const AGENT_META: AgentMeta[] = [
  { name: 'master',     label: 'Master',            description: 'Extracts the core assumptions from the raw opportunity canvas.', icon: Bot },
  { name: 'context',    label: 'Market Context',    description: 'Researches industry KPIs, competitors, and market trends.',       icon: Cpu },
  { name: 'capability', label: 'Capability',        description: 'Designs the L1–L3 capability map tailored to the initiative.',    icon: Layers },
  { name: 'journey',    label: 'Journey',           description: 'Maps customer journeys and friction points end-to-end.',          icon: Route },
  { name: 'systems',    label: 'Systems',           description: 'Recommends the target architecture and system components.',       icon: Server },
  { name: 'financial',  label: 'Financial',         description: 'Builds the NPV, ROI, and effort-based financial case.',           icon: DollarSign },
  { name: 'qa',         label: 'QA Validator',      description: 'Independently validates the compiled report against guardrails.', icon: ShieldQuestion },
];

const PROVIDER_OPTIONS: { value: LLMProvider; label: string; modelPlaceholder: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)',   modelPlaceholder: 'claude-sonnet-4-20250514' },
  { value: 'openai',    label: 'OpenAI',               modelPlaceholder: 'gpt-4o' },
  { value: 'google',    label: 'Google (Gemini)',      modelPlaceholder: 'gemini-2.0-flash' },
  { value: 'custom',    label: 'Custom (OpenAI-compat)', modelPlaceholder: 'my-model-name' },
];

const AGENT_DEFAULTS: Record<AgentName, { provider: LLMProvider; model: string; temperature: number; max_tokens: number }> = {
  master:     { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2, max_tokens: 8192 },
  context:    { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.1, max_tokens: 8192 },
  capability: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.1, max_tokens: 8192 },
  journey:    { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.1, max_tokens: 8192 },
  systems:    { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.1, max_tokens: 8192 },
  financial:  { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.1, max_tokens: 8192 },
  qa:         { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.0, max_tokens: 2048 },
};

interface FormState {
  provider: LLMProvider;
  model: string;
  api_key: string;       // staged plaintext; only sent on save
  base_url: string;
  temperature: number;
  max_tokens: number;
  skills_md: string;
  has_custom_key: boolean;
  dirty: boolean;
}

const toForm = (c: AgentConfigPublic): FormState => ({
  provider: c.provider,
  model: c.model,
  api_key: '',
  base_url: c.base_url || '',
  temperature: c.temperature,
  max_tokens: c.max_tokens,
  skills_md: c.skills_md || '',
  has_custom_key: c.has_custom_key,
  dirty: false,
});

export const AgentConfig: React.FC = () => {
  const { getIdToken } = useAuth();

  const [configs, setConfigs] = useState<Record<AgentName, AgentConfigPublic> | null>(null);
  const [forms, setForms] = useState<Record<AgentName, FormState> | null>(null);
  const [selected, setSelected] = useState<AgentName>('master');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [revealKey, setRevealKey] = useState(false);
  const [clearKey, setClearKey] = useState(false);

  // Load all agent configs on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { agents } = await listAgentConfigs(getIdToken);
        if (cancelled) return;
        const byName = {} as Record<AgentName, AgentConfigPublic>;
        const formsByName = {} as Record<AgentName, FormState>;
        for (const meta of AGENT_META) {
          const found = agents.find(a => a.agent_name === meta.name);
          const rec = found || {
            agent_name: meta.name,
            provider: AGENT_DEFAULTS[meta.name].provider,
            model: AGENT_DEFAULTS[meta.name].model,
            has_custom_key: false,
            base_url: '',
            temperature: AGENT_DEFAULTS[meta.name].temperature,
            max_tokens: AGENT_DEFAULTS[meta.name].max_tokens,
            skills_md: '',
          };
          byName[meta.name] = rec;
          formsByName[meta.name] = toForm(rec);
        }
        setConfigs(byName);
        setForms(formsByName);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load agent configs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getIdToken]);

  const form = forms?.[selected] ?? null;
  const meta = useMemo(() => AGENT_META.find(a => a.name === selected)!, [selected]);
  const providerMeta = useMemo(
    () => PROVIDER_OPTIONS.find(p => p.value === form?.provider) || PROVIDER_OPTIONS[0],
    [form?.provider],
  );

  const updateForm = (patch: Partial<FormState>) => {
    setForms(prev => {
      if (!prev) return prev;
      return { ...prev, [selected]: { ...prev[selected], ...patch, dirty: true } };
    });
    setSavedFlash(false);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await saveAgentConfig(selected, {
        provider: form.provider,
        model: form.model.trim(),
        api_key: form.api_key ? form.api_key : null,
        base_url: form.base_url ? form.base_url.trim() : null,
        temperature: form.temperature,
        max_tokens: form.max_tokens,
        skills_md: form.skills_md,
        clear_api_key: clearKey,
      }, getIdToken);
      setConfigs(prev => (prev ? { ...prev, [selected]: updated } : prev));
      setForms(prev => (prev ? { ...prev, [selected]: toForm(updated) } : prev));
      setClearKey(false);
      setRevealKey(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (e: any) {
      setError(e?.message || `Failed to save ${selected} config.`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    const d = AGENT_DEFAULTS[selected];
    updateForm({
      provider: d.provider,
      model: d.model,
      api_key: '',
      base_url: '',
      temperature: d.temperature,
      max_tokens: d.max_tokens,
      skills_md: '',
    });
    setClearKey(true);
  };

  const handleDiscard = () => {
    if (!configs) return;
    setForms(prev => (prev ? { ...prev, [selected]: toForm(configs[selected]) } : prev));
    setClearKey(false);
    setRevealKey(false);
  };

  return (
    <Layout>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#4648d4] mb-1">Intelligence Engine</p>
        <h1 className="text-3xl font-extrabold text-[#141b2c] tracking-tight">Agent Configuration</h1>
        <p className="text-slate-500 mt-2 max-w-3xl text-sm">
          Customize the LLM provider, model, and persona for each of the seven agents. Leave any field at its default
          to fall back to server-side settings. Skills / persona instructions are appended to the base system prompt —
          they never replace the built-in guardrails.
        </p>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading agent configurations…
        </div>
      )}

      {error && !loading && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-rose-800 break-words">{error}</div>
        </div>
      )}

      {!loading && forms && form && (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Left rail — agent picker */}
          <aside className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 self-start">
            <ul className="space-y-1">
              {AGENT_META.map(a => {
                const isSelected = a.name === selected;
                const isDirty = forms[a.name]?.dirty;
                const Icon = a.icon;
                return (
                  <li key={a.name}>
                    <button
                      onClick={() => setSelected(a.name)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                        isSelected
                          ? 'bg-accent-50 text-accent-700 ring-1 ring-accent-200'
                          : 'text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      <Icon className={cn('w-4 h-4 flex-shrink-0', isSelected ? 'text-accent-600' : 'text-slate-400')} />
                      <span className="text-sm font-semibold flex-1 capitalize">{a.label}</span>
                      {isDirty && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Right pane — editor for selected agent */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <header className="flex items-start gap-3 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center flex-shrink-0">
                <meta.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900 capitalize">{meta.label} Agent</h2>
                <p className="text-sm text-slate-500">{meta.description}</p>
              </div>
            </header>

            {/* Provider + Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Provider</label>
                <select
                  value={form.provider}
                  onChange={e => updateForm({ provider: e.target.value as LLMProvider })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                >
                  {PROVIDER_OPTIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Model</label>
                <input
                  type="text"
                  value={form.model}
                  onChange={e => updateForm({ model: e.target.value })}
                  placeholder={providerMeta.modelPlaceholder}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* API key */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                API Key
                {form.has_custom_key && !clearKey && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full normal-case tracking-normal">
                    <Key className="w-3 h-3" /> Custom key saved
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={revealKey ? 'text' : 'password'}
                  value={form.api_key}
                  onChange={e => { updateForm({ api_key: e.target.value }); setClearKey(false); }}
                  placeholder={
                    form.has_custom_key && !clearKey
                      ? 'Leave blank to keep existing key'
                      : '(using server default — paste a key to override)'
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setRevealKey(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                  title={revealKey ? 'Hide' : 'Reveal'}
                >
                  {revealKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.has_custom_key && (
                <label className="inline-flex items-center gap-2 mt-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearKey}
                    onChange={e => setClearKey(e.target.checked)}
                    className="rounded text-accent-600 focus:ring-accent-400"
                  />
                  Clear saved key and revert to server default
                </label>
              )}
            </div>

            {/* Base URL (custom only) */}
            {form.provider === 'custom' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Base URL
                </label>
                <input
                  type="url"
                  value={form.base_url}
                  onChange={e => updateForm({ base_url: e.target.value })}
                  placeholder="https://api.together.xyz/v1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Any OpenAI-compatible endpoint (Together, Groq, local vLLM, etc.)
                </p>
              </div>
            )}

            {/* Temperature + Max tokens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  <span>Temperature</span>
                  <span className="font-mono text-accent-700">{form.temperature.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.temperature}
                  onChange={e => updateForm({ temperature: parseFloat(e.target.value) })}
                  className="w-full accent-accent-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0 · deterministic</span>
                  <span>1 · creative</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Max Tokens</label>
                <input
                  type="number"
                  min={256}
                  max={32768}
                  step={256}
                  value={form.max_tokens}
                  onChange={e => updateForm({ max_tokens: Math.max(256, parseInt(e.target.value || '0', 10) || 0) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Skills.md */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Skills / Persona Instructions (Markdown)
              </label>
              <textarea
                value={form.skills_md}
                onChange={e => updateForm({ skills_md: e.target.value })}
                placeholder={`# Additional instructions\n\n- Always use GBP (£) for monetary figures.\n- Prefer British English spelling.\n- Cite sources inline when possible.`}
                rows={10}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent resize-y"
              />
              <p className="text-xs text-slate-400 mt-1">
                Appended to this agent's system prompt under a "User-Supplied Skills &amp; Instructions" section.
                Guardrails in the built-in prompt still apply.
              </p>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between pt-5 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleResetDefaults}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Revert fields to the hardcoded defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to defaults
                </button>
                {form.dirty && (
                  <button
                    onClick={handleDiscard}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    Discard changes
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {savedFlash && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !form.dirty}
                  className={cn(
                    'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors',
                    form.dirty && !saving
                      ? 'bg-accent-600 text-white hover:bg-accent-700'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed',
                  )}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </Layout>
  );
};
