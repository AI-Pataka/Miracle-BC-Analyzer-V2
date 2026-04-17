import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight, ArrowLeft, Globe, Briefcase, Building2,
  CheckCircle2, AlertCircle, Loader2, FileText, FileCode, FileType,
  XCircle, Clock, Zap,
  Share2, FileDown, FileCode2, Printer,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { ReportDashboard } from '../components/ReportDashboard';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { getAnalysis, exportUrl, subscribeAnalysis } from '../lib/apiClient';
import type { AnalysisEvent, AnalysisRecord, StageName } from '../types';

export const AnalysisViewer: React.FC = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const { getIdToken } = useAuth();
  const navigate = useNavigate();

  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [liveOutputs, setLiveOutputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Load the record on mount
  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const doc = await getAnalysis(analysisId, getIdToken);
        if (cancelled) return;
        setRecord(doc);
        // Seed live outputs from persisted stages for running/queued jobs
        const seeded: Record<string, string> = {};
        Object.entries(doc.stages || {}).forEach(([k, v]: [string, any]) => {
          if (v?.output) seeded[k] = v.output;
        });
        setLiveOutputs(seeded);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load analysis.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [analysisId, getIdToken]);

  // For running jobs, tail the SSE stream to keep liveOutputs fresh until it completes.
  useEffect(() => {
    if (!record || !analysisId) return;
    if (record.status !== 'running' && record.status !== 'queued') return;

    let unsub: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      const token = await getIdToken();
      if (!token || cancelled) return;
      unsub = subscribeAnalysis(analysisId, token, {
        onEvent: (event: AnalysisEvent) => {
          if (event.type === 'stage_output') {
            setLiveOutputs(prev => ({ ...prev, [event.stage]: event.markdown }));
          } else if (event.type === 'complete') {
            setRecord(prev => prev ? {
              ...prev,
              status: 'completed',
              final_output: event.final_output,
              qa_pass: event.qa_pass,
              qa_feedback: event.qa_feedback,
              attempts: event.attempts,
            } : prev);
          } else if (event.type === 'error') {
            setRecord(prev => prev ? { ...prev, status: 'failed', error: event.detail } : prev);
          }
        },
      });
    })();

    return () => { cancelled = true; unsub?.(); };
  }, [record?.status, analysisId, getIdToken]);

  const handleExport = async (kind: 'pdf' | 'html' | 'markdown') => {
    if (!analysisId) return;
    const token = await getIdToken();
    if (!token) return;
    window.open(exportUrl(analysisId, kind, token), '_blank', 'noopener,noreferrer');
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  const escapeHtml = (s: string): string =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const buildHtmlExport = (): string => {
    const md = record?.final_output || '';
    const industry = record?.industry || '';
    const consultingCompany = record?.consulting_company || '';
    const clientCompany = record?.client_company || '';
    const lines = md.split('\n');
    const out: string[] = [];

    let inList = false;
    let inTable = false;

    const flushList = () => {
      if (inList) { out.push('</ul>'); inList = false; }
    };
    const flushTable = () => {
      if (inTable) { out.push('</tbody></table>'); inTable = false; }
    };

    const inline = (s: string): string => {
      let t = escapeHtml(s);
      t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
      t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
      t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
      return t;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimEnd();

      if (line.startsWith('|') && line.endsWith('|') && line.length > 1) {
        const inner = line.slice(1, -1);
        if (/^[-:| ]+$/.test(inner)) { continue; }
        const cells = inner.split('|').map(c => c.trim());
        flushList();
        if (!inTable) {
          out.push('<table><thead><tr>');
          cells.forEach(c => out.push(`<th>${inline(c)}</th>`));
          out.push('</tr></thead><tbody>');
          inTable = true;
        } else {
          out.push('<tr>');
          cells.forEach(c => out.push(`<td>${inline(c)}</td>`));
          out.push('</tr>');
        }
        continue;
      } else if (inTable) {
        flushTable();
      }

      if (line.startsWith('```')) {
        flushList();
        out.push('<hr />');
        continue;
      }

      if (/^-{3,}$/.test(line)) {
        flushList();
        out.push('<hr />');
        continue;
      }

      const h = line.match(/^(#{1,6})\s+(.+)$/);
      if (h) {
        flushList();
        const level = h[1].length;
        out.push(`<h${level}>${inline(h[2])}</h${level}>`);
        continue;
      }

      const b = line.match(/^[-*+]\s+(.+)$/);
      if (b) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push(`<li>${inline(b[1])}</li>`);
        continue;
      } else if (inList) {
        flushList();
      }

      if (line === '') {
        out.push('<br />');
        continue;
      }

      out.push(`<p>${inline(line)}</p>`);
    }

    flushList();
    flushTable();

    const generated = new Date().toLocaleString();
    const title = `${escapeHtml(clientCompany)} — ${escapeHtml(industry)} — Business Capability Analysis`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1e293b; max-width: 960px; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.6; }
  h1 { border-bottom: 3px solid #4648d4; padding-bottom: 0.4em; color: #141b2c; }
  h2 { border-left: 4px solid #4648d4; padding-left: 0.6em; color: #141b2c; margin-top: 2em; }
  h3, h4, h5, h6 { color: #141b2c; margin-top: 1.5em; }
  p { margin: 0.5em 0; }
  ul { padding-left: 1.5em; }
  li { margin: 0.3em 0; }
  hr { border: 0; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
  code { background: #f1f5f9; padding: 0.15em 0.4em; border-radius: 4px; font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 0.92em; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.95em; }
  th { background: #4648d4; color: #fff; text-align: left; padding: 0.6em 0.8em; font-weight: 600; }
  td { padding: 0.5em 0.8em; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tbody tr:nth-child(odd) { background: #ffffff; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .metadata { background: #f1f3ff; border-left: 4px solid #4648d4; padding: 1em 1.2em; margin-bottom: 2em; border-radius: 4px; font-size: 0.9em; }
  .metadata strong { color: #4648d4; }
  @media print {
    body { max-width: 100%; margin: 0; padding: 0.5in; }
    h1, h2, h3 { page-break-after: avoid; }
    table, tr { page-break-inside: avoid; }
    .metadata { background: #f1f3ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th { background: #4648d4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="metadata">
  <div><strong>Generated:</strong> ${escapeHtml(generated)}</div>
  <div><strong>Industry:</strong> ${escapeHtml(industry)}</div>
  <div><strong>Consulting Company:</strong> ${escapeHtml(consultingCompany)}</div>
  <div><strong>Client Company:</strong> ${escapeHtml(clientCompany)}</div>
</div>
${out.join('\n')}
</body>
</html>`;
  };

  const exportFilename = (ext: string): string => {
    const slug = [record?.client_company || '', record?.industry || '', 'report']
      .filter(Boolean)
      .map(s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''))
      .filter(Boolean)
      .join('-');
    return `${slug || 'analysis'}.${ext}`;
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([record?.final_output || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename('md');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportHTML = () => {
    const blob = new Blob([buildHtmlExport()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename('html');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handlePrintPDF = () => {
    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow pop-ups for this site so we can open the print dialog.');
      return;
    }
    win.document.open();
    win.document.write(buildHtmlExport());
    win.document.close();
    setTimeout(() => { win.print(); }, 600);
    setShowExportMenu(false);
  };

  // ─── Render helpers ─────────────────────────────────────────────────

  const renderBreadcrumb = () => (
    <nav className="mb-6 flex items-center gap-2 text-sm">
      <Link to="/history" className="text-slate-500 hover:text-slate-700">History</Link>
      <ChevronRight className="w-3 h-3 text-slate-400" />
      <span className="text-[#006190] font-semibold truncate">
        {record?.initiative_name || 'Analysis'}
      </span>
    </nav>
  );

  const renderHeader = () => {
    if (!record) return null;
    return (
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm mb-4">
        <button
          onClick={() => navigate('/history')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {record.industry && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-accent-50 text-accent-700 border border-accent-200">
              <Globe className="w-3.5 h-3.5" />{record.industry}
            </span>
          )}
          {record.consulting_company && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">
              <Briefcase className="w-3.5 h-3.5" />{record.consulting_company}
            </span>
          )}
          {record.client_company && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">
              <Building2 className="w-3.5 h-3.5" />{record.client_company}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(record.created_at)}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {record.status === 'completed' && (
            <div className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold',
              record.qa_pass
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
            )}>
              {record.qa_pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              QA: {record.qa_pass ? 'PASS' : 'WARNINGS'}
            </div>
          )}
          {(record.status === 'running' || record.status === 'queued') && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-accent-50 text-accent-700 ring-1 ring-accent-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {record.status}
            </div>
          )}
          {record.status === 'failed' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 ring-1 ring-rose-200">
              <XCircle className="w-3.5 h-3.5" />
              FAILED
            </div>
          )}
          {record.status === 'completed' && record.final_output && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(v => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-52 text-sm">
                    <button onClick={handleExportMarkdown} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                      <FileDown className="w-4 h-4 text-accent-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800">Download Markdown</p>
                        <p className="text-[10px] text-slate-400">.md file</p>
                      </div>
                    </button>
                    <button onClick={handleExportHTML} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                      <FileCode2 className="w-4 h-4 text-accent-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800">Download HTML</p>
                        <p className="text-[10px] text-slate-400">Styled standalone page</p>
                      </div>
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button onClick={handlePrintPDF} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                      <Printer className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800">Print / Save as PDF</p>
                        <p className="text-[10px] text-slate-400">Use browser print dialog</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {record.status === 'completed' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleExport('pdf')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 px-3 py-1.5 rounded-xl hover:bg-rose-50 border border-rose-200 transition-colors"
              >
                <FileType className="w-3.5 h-3.5" />
                PDF
              </button>
              <button
                onClick={() => handleExport('html')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 px-3 py-1.5 rounded-xl hover:bg-sky-50 border border-sky-200 transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" />
                HTML
              </button>
              <button
                onClick={() => handleExport('markdown')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Markdown
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSummaryPanel = () => {
    const problem = record?.problem_statement || '';
    const preview = problem.length > 300 ? problem.slice(0, 300) + '…' : problem;
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="bg-gradient-to-r from-accent-600 to-violet-600 px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
          <Zap className="w-3.5 h-3.5 text-white" />
          <h3 className="text-xs font-bold text-white">Idea Summary</h3>
        </div>
        <div className="px-3 py-2.5 overflow-y-auto flex-1 min-h-0">
          {preview ? (
            <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">{preview}</p>
          ) : (
            <p className="text-[11px] text-slate-400 italic">No problem statement recorded for this analysis.</p>
          )}
        </div>
      </div>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <Layout>
        {renderBreadcrumb()}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading analysis…
        </div>
      </Layout>
    );
  }

  if (error || !record) {
    return (
      <Layout>
        {renderBreadcrumb()}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-2">Could not load analysis</h3>
          <p className="text-sm text-rose-800 mb-4">{error || 'Not found.'}</p>
          <Link
            to="/history"
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent-700 hover:text-accent-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to history
          </Link>
        </div>
      </Layout>
    );
  }

  // Choose what to render: completed shows final_output, in-progress shows stitched stage outputs
  let markdown = '';
  if (record.status === 'completed' && record.final_output) {
    markdown = record.final_output;
  } else {
    const order: StageName[] = ['context', 'capability', 'journey', 'systems', 'financial'];
    const chunks = order.map(k => liveOutputs[k] || '').filter(Boolean);
    if (chunks.length) {
      markdown = '# Business Capability Analysis Report\n\n---\n\n' + chunks.join('\n\n---\n\n');
    }
  }

  return (
    <Layout
      contextIndustry={record.industry}
      contextClient={record.client_company}
      contextCompany={record.consulting_company}
      forceCollapsed
    >
      {renderBreadcrumb()}
      {renderHeader()}

      {record.status === 'failed' && record.error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4 text-sm text-rose-800 break-words">
          <strong className="block mb-1">Error:</strong>
          <span className="font-mono">{record.error}</span>
        </div>
      )}

      {record.status === 'completed' && !record.qa_pass && record.qa_feedback && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-800 mb-4 break-words">
          <strong>QA Feedback:</strong> {record.qa_feedback}
        </div>
      )}

      {markdown ? (
        <div className="flex gap-3 items-start">
          <div className="w-44 lg:w-52 xl:w-56 flex-shrink-0 sticky top-2 max-h-[calc(100vh-5rem)] hidden md:block">
            {renderSummaryPanel()}
          </div>
          <div className="flex-1 min-w-0 overflow-x-auto">
            <ReportDashboard markdown={markdown} />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500 text-sm">
          {record.status === 'running' || record.status === 'queued'
            ? 'Analysis is still running — outputs will appear as each stage completes.'
            : 'No report content available for this analysis.'}
        </div>
      )}
    </Layout>
  );
};
