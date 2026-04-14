import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

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

export const UserDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const [industry, setIndustry] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [consultantName, setConsultantName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pre-populate from existing profile
  useEffect(() => {
    if (profile) {
      setIndustry(profile.industry || '');
      setClientCompany(profile.client_company || '');
      setConsultantName(profile.consultant_name || '');
    }
  }, [profile]);

  const handleSaveSetup = async (e: React.FormEvent) => {
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

  const handleResetDefaults = () => {
    setIndustry(profile?.industry || '');
    setClientCompany(profile?.client_company || '');
    setConsultantName(profile?.consultant_name || '');
    setSaveError(null);
    setSaved(false);
  };

  const fieldCls =
    'w-full bg-surface-container-low border-0 rounded-sm px-4 py-4 text-on-surface text-sm font-medium focus:bg-surface-container-lowest focus:outline-none focus:ring-0 border-b-2 border-transparent focus:border-primary transition-all';

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Hero */}
        <section>
          <p className="uppercase tracking-widest text-primary text-xs font-semibold mb-2 font-label">User Dashboard</p>
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-on-surface font-headline">
            Welcome, {profile?.display_name}!
          </h1>
        </section>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-8">

          {/* Left col — Profile Details + Decorative Card */}
          <div className="col-span-12 lg:col-span-5 space-y-6">

            {/* Profile Details */}
            <div className="bg-surface-container-lowest p-8 xl:p-10 rounded-md shadow-[0px_4px_20px_rgba(20,27,44,0.04)] relative overflow-hidden">
              <div className="absolute left-0 top-10 w-1 h-12 bg-tertiary rounded-r" />
              <p className="uppercase tracking-widest text-primary text-[10px] font-semibold mb-6 font-label">System Identity</p>
              <h3 className="text-2xl font-bold font-headline mb-8">Profile Details</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded bg-surface-container-low flex items-center justify-center text-primary flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </div>
                  <div>
                    <p className="uppercase tracking-widest text-[10px] text-slate-500 font-semibold mb-0.5 font-label">Email Address</p>
                    <p className="font-semibold text-on-surface text-sm break-all">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded bg-surface-container-low flex items-center justify-center text-primary flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">badge</span>
                  </div>
                  <div>
                    <p className="uppercase tracking-widest text-[10px] text-slate-500 font-semibold mb-0.5 font-label">System Role</p>
                    <p className="font-semibold text-on-surface capitalize">{profile?.role}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded bg-surface-container-low flex items-center justify-center text-primary flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                  </div>
                  <div>
                    <p className="uppercase tracking-widest text-[10px] text-slate-500 font-semibold mb-0.5 font-label">Member Since</p>
                    <p className="font-semibold text-on-surface">{profile?.created_at?.toDate().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Intelligence Card */}
            <div className="bg-primary p-8 rounded-md text-white overflow-hidden relative">
              <div className="relative z-10">
                <h4 className="font-headline font-bold text-lg mb-2">Need a New Analysis?</h4>
                <p className="text-white/80 text-sm mb-6 leading-relaxed">
                  Initiate a fresh architectural review using our intelligence engine.
                </p>
                <button
                  onClick={() => navigate('/idea-entry')}
                  className="bg-white text-primary px-6 py-2 rounded-lg font-bold text-sm hover:bg-white/90 transition-all"
                >
                  Launch Analysis
                </button>
              </div>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[7rem] text-white/10 pointer-events-none select-none">
                finance
              </span>
            </div>
          </div>

          {/* Right col — Project Context Form + Insight Bento */}
          <div className="col-span-12 lg:col-span-7">
            <div className="bg-surface-container-lowest p-8 xl:p-10 rounded-md shadow-[0px_4px_20px_rgba(20,27,44,0.04)]">
              <p className="uppercase tracking-widest text-primary text-[10px] font-semibold mb-6 font-label">Active Engagement</p>
              <h3 className="text-2xl font-bold font-headline mb-8">Project Context Setup</h3>

              <form className="space-y-8" onSubmit={handleSaveSetup}>
                {/* Industry Sector */}
                <div className="space-y-2">
                  <label htmlFor="industry-select" className="uppercase tracking-widest text-[11px] text-slate-500 font-semibold ml-1 font-label">
                    Industry Sector
                  </label>
                  <div className="relative">
                    <select
                      id="industry-select"
                      className={fieldCls + ' appearance-none pr-10'}
                      value={industry}
                      onChange={e => setIndustry(e.target.value)}
                    >
                      <option value="">Select an industry...</option>
                      {INDUSTRY_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Client Company */}
                <div className="space-y-2">
                  <label className="uppercase tracking-widest text-[11px] text-slate-500 font-semibold ml-1 font-label">
                    Client Company
                  </label>
                  <input
                    className={fieldCls}
                    placeholder="Enter corporate entity name..."
                    value={clientCompany}
                    onChange={e => setClientCompany(e.target.value)}
                  />
                </div>

                {/* Consultant + Access Level */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="uppercase tracking-widest text-[11px] text-slate-500 font-semibold ml-1 font-label">
                      Consultant / Role
                    </label>
                    <input
                      className={fieldCls}
                      placeholder="e.g., John Smith — Lead Architect"
                      value={consultantName}
                      onChange={e => setConsultantName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="uppercase tracking-widest text-[11px] text-slate-500 font-semibold ml-1 font-label">
                      Access Level
                    </label>
                    <div className="flex flex-wrap items-center gap-2 py-4">
                      <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-full uppercase tracking-wider">
                        {profile?.role === 'admin' ? 'Full Access' : 'Standard'}
                      </span>
                      <span className="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs font-bold rounded-full uppercase tracking-wider">
                        Encrypted
                      </span>
                    </div>
                  </div>
                </div>

                {saveError && (
                  <p className="text-xs text-error bg-error-container px-3 py-2 rounded-lg">{saveError}</p>
                )}

                {/* Actions */}
                <div className="pt-6 flex justify-end items-center gap-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="text-primary font-bold text-sm hover:underline"
                  >
                    Reset Defaults
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-gradient-to-br from-primary to-primary-container text-white px-8 py-3 rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : saved ? (
                      <>
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        Saved!
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Save Context
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Intelligence Insights Bento */}
            <div className="mt-8 grid grid-cols-2 gap-6">
              <div className="bg-surface-container-lowest p-6 rounded-md shadow-sm flex items-center gap-4">
                <div className="p-3 bg-surface-container-low text-tertiary rounded flex-shrink-0">
                  <span className="material-symbols-outlined">monitoring</span>
                </div>
                <div>
                  <p className="text-2xl font-bold font-headline">14</p>
                  <p className="uppercase tracking-widest text-[10px] text-slate-500 font-semibold font-label">Active Journeys</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-md shadow-sm flex items-center gap-4">
                <div className="p-3 bg-surface-container-low text-primary rounded flex-shrink-0">
                  <span className="material-symbols-outlined">verified_user</span>
                </div>
                <div>
                  <p className="text-2xl font-bold font-headline">98.2%</p>
                  <p className="uppercase tracking-widest text-[10px] text-slate-500 font-semibold font-label">Compliance Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info Strip */}
        <section className="pt-10 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-3">
            <h5 className="uppercase tracking-widest text-xs text-primary font-semibold font-label">System Integrity</h5>
            <p className="text-sm text-slate-600 leading-relaxed">
              All financial architectural models are encrypted using AES-256 standards. Your session is monitored for security compliance.
            </p>
          </div>
          <div className="space-y-3">
            <h5 className="uppercase tracking-widest text-xs text-primary font-semibold font-label">Quick Links</h5>
            <ul className="text-sm font-medium space-y-2 text-on-surface">
              <li><a className="hover:text-primary transition-colors" href="#">Documentation Portal</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Audit Logs</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Security Settings</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h5 className="uppercase tracking-widest text-xs text-primary font-semibold font-label">Intelligence Status</h5>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold">Engine Online</span>
            </div>
            <p className="text-xs text-slate-400">Last updated: 2 mins ago</p>
          </div>
        </section>

      </div>
    </Layout>
  );
};
