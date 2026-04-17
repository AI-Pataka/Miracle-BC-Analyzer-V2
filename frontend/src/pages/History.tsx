import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Filter, Calendar, Building2, Globe, Zap,
  CheckCircle2, AlertCircle, XCircle, Loader2, Trash2, Clock,
  FileText, ChevronRight,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { listAnalyses, deleteAnalysis } from '../lib/apiClient';
import type { AnalysisSummary } from '../types';

const INDUSTRY_OPTIONS = [
  '',
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

const useDebounced = <T,>(value: T, delay = 300): T => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

export const History: React.FC = () => {
  const { getIdToken } = useAuth();
  const navigate = useNavigate();

  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const debouncedSearch = useDebounced(search, 300);
  const debouncedClient = useDebounced(clientCompany, 300);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const { analyses } = await listAnalyses({
        q: debouncedSearch || undefined,
        industry: industry || undefined,
        client_company: debouncedClient || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }, getIdToken);
      setAnalyses(analyses);
    } catch (e: any) {
      setError(e?.message || 'Failed to load analyses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, industry, debouncedClient, dateFrom, dateTo]);

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteAnalysis(id, getIdToken);
      setAnalyses(prev => prev.filter(a => a.analysis_id !== id));
    } catch (e: any) {
      setError(e?.message || 'Failed to delete analysis.');
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setIndustry('');
    setClientCompany('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = !!(search || industry || clientCompany || dateFrom || dateTo);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const statusBadge = (a: AnalysisSummary) => {
    if (a.status === 'completed') {
      return (
        <span className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
          a.qa_pass ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
        )}>
          {a.qa_pass ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {a.qa_pass ? 'QA pass' : 'QA warn'}
        </span>
      );
    }
    if (a.status === 'running' || a.status === 'queued') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-50 text-accent-700">
          <Loader2 className="w-3 h-3 animate-spin" />
          {a.status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700">
        <XCircle className="w-3 h-3" />
        failed
      </span>
    );
  };

  return (
    <Layout>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#4648d4] mb-1">Archive</p>
          <h1 className="text-3xl font-extrabold text-[#141b2c] tracking-tight">Analysis History</h1>
          <p className="text-slate-500 mt-2 max-w-2xl text-sm">
            Every analysis you've run is saved here. Search, filter, and reopen any prior report — including background
            jobs still in progress.
          </p>
        </div>
        <Link
          to="/idea-entry"
          className="inline-flex items-center gap-2 bg-gradient-to-br from-[#006190] to-[#007bb5] text-white font-bold px-5 py-2.5 rounded-lg hover:shadow-lg transition-shadow text-sm"
        >
          <Zap className="w-4 h-4" />
          New Analysis
        </Link>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search initiative, problem statement…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-2"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Industry</label>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
            >
              {INDUSTRY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt || 'All industries'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Client Company</label>
            <input
              type="text"
              placeholder="e.g., Verizon"
              value={clientCompany}
              onChange={e => setClientCompany(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
            />
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading analyses…
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-rose-800">{error}</div>
        </div>
      ) : analyses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 mb-1">
            {hasFilters ? 'No analyses match your filters' : 'No analyses yet'}
          </h3>
          <p className="text-sm text-slate-500 mb-5">
            {hasFilters ? 'Try clearing a filter or broadening the date range.' : 'Run your first analysis to see it listed here.'}
          </p>
          {!hasFilters && (
            <Link
              to="/idea-entry"
              className="inline-flex items-center gap-2 bg-accent-600 text-white font-semibold py-2.5 px-5 rounded-xl hover:bg-accent-700 transition-colors text-sm"
            >
              <Zap className="w-4 h-4" />
              Start Analysis
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {analyses.map(a => (
              <div
                key={a.analysis_id}
                onClick={() => navigate(`/history/${a.analysis_id}`)}
                className="group flex items-start gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {a.initiative_name || 'Untitled analysis'}
                    </h3>
                    {statusBadge(a)}
                    {a.attempts > 1 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                        {a.attempts} attempts
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                    {a.industry && (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {a.industry}
                      </span>
                    )}
                    {a.client_company && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {a.client_company}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(a.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(a.analysis_id, a.initiative_name || 'Untitled'); }}
                    disabled={deletingId === a.analysis_id}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    {deletingId === a.analysis_id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1 group-hover:text-accent-500" />
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
};
