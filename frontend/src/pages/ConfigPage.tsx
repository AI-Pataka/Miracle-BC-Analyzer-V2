import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import {
  Layers, Route, SlidersHorizontal, ShieldCheck,
  Loader2, Check, Globe, Building2, Briefcase, ArrowRight,
} from 'lucide-react';
import { cn } from '../lib/utils';

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

interface SectionTile {
  label: string;
  description: string;
  path: string;
  icon: React.ElementType;
  accent: string;
  badge?: string;
  adminOnly?: boolean;
}

const SECTION_TILES: SectionTile[] = [
  {
    label: 'Capability Registry',
    description: 'Define and govern enterprise capabilities across all business domains, with AI/Non-AI categorisation and L1–L4 hierarchy.',
    path: '/capabilities',
    icon: Layers,
    accent: 'from-indigo-500 to-indigo-600',
    badge: 'Capabilities',
  },
  {
    label: 'Journey Frameworks',
    description: 'Map customer journeys with phase-by-phase steps, friction points, and required capability assignments.',
    path: '/journeys',
    icon: Route,
    accent: 'from-sky-500 to-sky-600',
    badge: 'Journeys',
  },
  {
    label: 'Strategy & Rules',
    description: 'Configure strategic priorities, value streams, effort sizing matrices, and market landscape rules used in analysis.',
    path: '/strategy',
    icon: SlidersHorizontal,
    accent: 'from-violet-500 to-violet-600',
    badge: 'Strategy',
  },
  {
    label: 'Admin Controls',
    description: 'Manage users, roles, access levels, and organisation-wide settings. Restricted to administrators.',
    path: '/admin/dashboard',
    icon: ShieldCheck,
    accent: 'from-rose-500 to-rose-600',
    badge: 'Admin',
    adminOnly: true,
  },
];

export const ConfigPage: React.FC = () => {
  const { profile, user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [industry, setIndustry] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [consultantName, setConsultantName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setIndustry(profile.industry || '');
      setClientCompany(profile.client_company || '');
      setConsultantName(profile.consultant_name || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        industry,
        client_company: clientCompany,
        consultant_name: consultantName,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const visibleTiles = SECTION_TILES.filter(t => !t.adminOnly || isAdmin);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-10">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="space-y-1">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-[0.05em]">System Configuration</span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Config Centre</h1>
          <p className="text-slate-500 font-medium">
            Manage your knowledge base and project context — everything the analysis engine needs.
          </p>
        </div>

        {/* ── Section Tiles ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Configuration Sections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5">
            {visibleTiles.map((tile) => (
              <button
                key={tile.path}
                type="button"
                onClick={() => navigate(tile.path)}
                className="group text-left bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden"
              >
                {/* Gradient header strip */}
                <div className={cn('h-1.5 w-full bg-gradient-to-r', tile.accent)} />
                <div className="p-5 space-y-4">
                  {/* Icon + Badge */}
                  <div className="flex items-start justify-between">
                    <div className={cn('p-2.5 rounded-xl bg-gradient-to-br text-white', tile.accent)}>
                      <tile.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tile.badge}</span>
                  </div>
                  {/* Label + Description */}
                  <div className="space-y-1.5">
                    <p className="font-bold text-slate-900 text-sm leading-snug">{tile.label}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{tile.description}</p>
                  </div>
                  {/* CTA */}
                  <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-semibold group-hover:gap-2.5 transition-all">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Project Context Setup ────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Project Context</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Left accent bar */}
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
              <div className="p-8">
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  This context is pre-populated into every analysis. Keep it updated to reflect your current engagement.
                </p>

                <form onSubmit={handleSave}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Industry */}
                    <div className="space-y-1.5">
                      <label htmlFor="cfg-industry" className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Globe className="w-3 h-3" /> Industry
                      </label>
                      <select
                        id="cfg-industry"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                        value={industry}
                        onChange={e => setIndustry(e.target.value)}
                      >
                        <option value="">Select industry…</option>
                        {INDUSTRY_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    {/* Client Company */}
                    <div className="space-y-1.5">
                      <label htmlFor="cfg-client" className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Building2 className="w-3 h-3" /> Client Company
                      </label>
                      <input
                        id="cfg-client"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                        placeholder="e.g. Verizon"
                        value={clientCompany}
                        onChange={e => setClientCompany(e.target.value)}
                      />
                    </div>

                    {/* Consultant */}
                    <div className="space-y-1.5">
                      <label htmlFor="cfg-consultant" className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Briefcase className="w-3 h-3" /> Consultant / Role
                      </label>
                      <input
                        id="cfg-consultant"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                        placeholder="e.g. Jane Smith — Lead Architect"
                        value={consultantName}
                        onChange={e => setConsultantName(e.target.value)}
                      />
                    </div>
                  </div>

                  {saveError && (
                    <p className="mt-4 text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{saveError}</p>
                  )}

                  <div className="mt-6 flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className={cn(
                        'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all',
                        saved
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700',
                        saving && 'opacity-60 cursor-not-allowed',
                      )}
                    >
                      {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      ) : saved ? (
                        <><Check className="w-4 h-4" /> Saved!</>
                      ) : (
                        'Save Context'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIndustry(profile?.industry || '');
                        setClientCompany(profile?.client_company || '');
                        setConsultantName(profile?.consultant_name || '');
                        setSaveError(null);
                      }}
                      className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
};
