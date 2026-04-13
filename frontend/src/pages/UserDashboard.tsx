import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { Calendar, Mail, Shield, User, Building2, Briefcase, Globe, Save, Check } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

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

  const [industry, setIndustry] = useState('Telecommunications');
  const [clientCompany, setClientCompany] = useState('Verizon');
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

  const handleSaveSetup = async () => {
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

  const inputCls =
    'w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-400 bg-white placeholder:text-slate-400';

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900 break-words">Welcome, {profile?.display_name}!</h1>
          <p className="text-slate-600 mt-2 text-sm md:text-base">Manage your profile and configure your default project context.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Details */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-accent-500" />
              Profile Details
            </h2>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-50">
                <span className="text-slate-500 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" /> Email
                </span>
                <span className="text-slate-900 font-medium text-sm break-all">{profile?.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Role
                </span>
                <span className="text-accent-600 font-bold capitalize">{profile?.role}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Member Since
                </span>
                <span className="text-slate-900 font-medium">
                  {profile?.created_at?.toDate().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* User Setup / Context Configuration */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-accent-500" />
              Project Context Setup
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              These defaults auto-populate the global header and Idea Entry form.
            </p>

            <div className="space-y-4">
              {/* Industry */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" /> Industry
                </label>
                <select
                  className={inputCls}
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                >
                  <option value="">Select an industry...</option>
                  {INDUSTRY_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Client Company */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> Client Company
                </label>
                <input
                  className={inputCls}
                  placeholder="e.g., Verizon"
                  value={clientCompany}
                  onChange={e => setClientCompany(e.target.value)}
                />
              </div>

              {/* Consultant Name */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Consultant / Role
                </label>
                <input
                  className={inputCls}
                  placeholder="e.g., John Smith — Lead Architect"
                  value={consultantName}
                  onChange={e => setConsultantName(e.target.value)}
                />
              </div>

              {/* Save */}
              {saveError && (
                <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{saveError}</p>
              )}

              <button
                onClick={handleSaveSetup}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-accent-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-accent-700 transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Context
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
