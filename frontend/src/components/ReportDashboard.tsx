import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Target, BarChart3, Layers, Route, Server, DollarSign,
  Calendar, AlertTriangle, Grid3X3, Shield, Lightbulb,
  ClipboardList, ChevronDown, ChevronRight, FileText,
  TrendingUp, Zap, CheckCircle2, ArrowRight, BookOpen,
} from 'lucide-react';
import {
  parseReport, parseMarkdownTable, extractBullets, extractKeyValues,
  type ReportSection, type ParsedReport, type SectionType,
} from '../lib/reportParser';

// ─── Icon map for section types ────────────────────────────────────────────

const SECTION_ICONS: Record<SectionType, React.ReactNode> = {
  hero: <Target className="w-5 h-5" />,
  kpi: <BarChart3 className="w-5 h-5" />,
  capabilities: <Layers className="w-5 h-5" />,
  journey: <Route className="w-5 h-5" />,
  architecture: <Server className="w-5 h-5" />,
  financial: <DollarSign className="w-5 h-5" />,
  roadmap: <Calendar className="w-5 h-5" />,
  risks: <AlertTriangle className="w-5 h-5" />,
  swot: <Grid3X3 className="w-5 h-5" />,
  porters: <Shield className="w-5 h-5" />,
  recommendations: <Lightbulb className="w-5 h-5" />,
  impact: <TrendingUp className="w-5 h-5" />,
  requirements: <ClipboardList className="w-5 h-5" />,
  systems: <Server className="w-5 h-5" />,
  appendix: <BookOpen className="w-5 h-5" />,
  generic: <FileText className="w-5 h-5" />,
};

const SECTION_COLORS: Record<SectionType, string> = {
  hero: 'from-accent-600 to-violet-600',
  kpi: 'from-emerald-500 to-teal-600',
  capabilities: 'from-blue-500 to-indigo-600',
  journey: 'from-purple-500 to-fuchsia-600',
  architecture: 'from-slate-600 to-slate-800',
  financial: 'from-green-500 to-emerald-700',
  roadmap: 'from-orange-500 to-amber-600',
  risks: 'from-rose-500 to-red-600',
  swot: 'from-cyan-500 to-blue-600',
  porters: 'from-indigo-500 to-purple-600',
  recommendations: 'from-yellow-500 to-orange-500',
  impact: 'from-teal-500 to-cyan-600',
  requirements: 'from-violet-500 to-purple-600',
  systems: 'from-gray-600 to-gray-800',
  appendix: 'from-slate-400 to-slate-600',
  generic: 'from-slate-500 to-slate-700',
};

// ─── Section Components ────────────────────────────────────────────────────

const HeroSection: React.FC<{ section: ReportSection }> = ({ section }) => (
  <div className="bg-gradient-to-br from-accent-600 to-violet-700 rounded-2xl p-6 md:p-8 text-white shadow-lg overflow-hidden">
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-white/20 p-2.5 rounded-xl flex-shrink-0">
        <Target className="w-6 h-6" />
      </div>
      <h2 className="text-xl md:text-2xl font-bold break-words min-w-0">{section.title}</h2>
    </div>
    <div className="text-white/90 leading-relaxed text-sm md:text-base break-words">
      {section.content.split('\n').filter(l => l.trim() && !l.startsWith('#')).map((line, i) => (
        <p key={i} className="mb-3">{line.replace(/\*\*/g, '')}</p>
      ))}
    </div>
  </div>
);

const KPISection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const bullets = extractBullets(section.content);
  const colors = ['bg-emerald-50 text-emerald-700 border-emerald-200', 'bg-blue-50 text-blue-700 border-blue-200', 'bg-violet-50 text-violet-700 border-violet-200', 'bg-amber-50 text-amber-700 border-amber-200', 'bg-rose-50 text-rose-700 border-rose-200', 'bg-cyan-50 text-cyan-700 border-cyan-200'];

  if (bullets.length === 0) return <GenericSection section={section} />;

  return (
    <SectionWrapper section={section}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bullets.map((kpi, i) => (
          <div key={i} className={`rounded-xl p-5 border ${colors[i % colors.length]}`}>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium leading-relaxed">{kpi}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};

const CapabilitiesSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const subs = section.subsections || [];
  if (subs.length === 0) return <GenericSection section={section} />;

  return (
    <SectionWrapper section={section}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subs.map((sub, i) => {
          const kvs = extractKeyValues(sub.content);
          const isNew = /\(NEW\)/i.test(sub.title);
          const isEnhance = /\(ENHANCE\)/i.test(sub.title);
          const cleanTitle = sub.title.replace(/^\d+\.\s*/, '');

          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow overflow-hidden">
              <div className="flex items-start justify-between mb-3 min-w-0">
                <h4 className="font-bold text-slate-900 text-sm leading-tight pr-2 break-words min-w-0">{cleanTitle.replace(/\s*\(NEW\)|\(ENHANCE\)/gi, '')}</h4>
                <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                  isNew ? 'bg-blue-100 text-blue-700' : isEnhance ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {isNew ? 'NEW' : isEnhance ? 'ENHANCE' : 'EXISTING'}
                </span>
              </div>
              {kvs.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {kvs.map((kv, j) => (
                    <div key={j} className="flex items-start gap-2 text-xs min-w-0">
                      <span className="font-semibold text-slate-500 flex-shrink-0">{kv.key}</span>
                      <span className="text-slate-700 break-words min-w-0">{kv.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {extractBullets(sub.content).length > 0 && (
                <ul className="space-y-1">
                  {extractBullets(sub.content).map((b, j) => (
                    <li key={j} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <ArrowRight className="w-3 h-3 mt-0.5 text-slate-400 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </SectionWrapper>
  );
};

const RoadmapSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const subs = section.subsections || [];
  if (subs.length === 0) return <GenericSection section={section} />;

  const phaseColors = ['border-blue-400 bg-blue-50', 'border-violet-400 bg-violet-50', 'border-emerald-400 bg-emerald-50', 'border-amber-400 bg-amber-50'];
  const dotColors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500'];

  return (
    <SectionWrapper section={section}>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
        <div className="space-y-6">
          {subs.map((sub, i) => (
            <div key={i} className="relative flex gap-5">
              <div className={`w-12 h-12 rounded-full ${dotColors[i % dotColors.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 z-10 shadow-md`}>
                {i + 1}
              </div>
              <div className={`flex-1 rounded-xl border-l-4 ${phaseColors[i % phaseColors.length]} p-5`}>
                <h4 className="font-bold text-slate-900 text-sm mb-2">{sub.title}</h4>
                <ul className="space-y-1.5">
                  {extractBullets(sub.content).map((b, j) => (
                    <li key={j} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <ArrowRight className="w-3 h-3 mt-0.5 text-slate-400 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                {extractKeyValues(sub.content).map((kv, j) => (
                  <p key={j} className="text-xs text-slate-500 mt-2">
                    <span className="font-semibold">{kv.key}:</span> {kv.value}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Extra content below subsections (like Total Investment) */}
      {section.content.split('\n').filter(l => l.startsWith('**') && !l.startsWith('###')).map((line, i) => (
        <p key={i} className="text-sm font-medium text-slate-700 mt-4">{line.replace(/\*\*/g, '')}</p>
      ))}
    </SectionWrapper>
  );
};

const RiskSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const table = parseMarkdownTable(section.content);
  if (table.headers.length === 0) return <GenericSection section={section} />;

  const severityColor = (prob: string, impact: string) => {
    const isHigh = /high/i.test(prob) || /high/i.test(impact);
    const isMedium = /medium/i.test(prob) || /medium/i.test(impact);
    if (isHigh) return 'border-rose-300 bg-rose-50';
    if (isMedium) return 'border-amber-300 bg-amber-50';
    return 'border-slate-200 bg-slate-50';
  };

  const badgeColor = (val: string) => {
    if (/high/i.test(val)) return 'bg-rose-100 text-rose-700';
    if (/medium/i.test(val)) return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  return (
    <SectionWrapper section={section}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {table.rows.map((row, i) => (
          <div key={i} className={`rounded-xl border-l-4 p-5 ${severityColor(row[1] || '', row[2] || '')}`}>
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-bold text-slate-900 text-sm">{row[0]}</h4>
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${/high/i.test(row[2] || '') ? 'text-rose-500' : 'text-amber-500'}`} />
            </div>
            <div className="flex gap-2 mb-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor(row[1] || '')}`}>
                {row[1] || 'N/A'} Prob.
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor(row[2] || '')}`}>
                {row[2] || 'N/A'} Impact
              </span>
            </div>
            {row[3] && <p className="text-xs text-slate-600"><span className="font-semibold">Mitigation:</span> {row[3]}</p>}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};

const FinancialSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const table = parseMarkdownTable(section.content);
  if (table.headers.length === 0) return <GenericSection section={section} />;

  return (
    <SectionWrapper section={section}>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-emerald-50 to-teal-50">
              {table.headers.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => {
              const isTotal = row[0]?.toLowerCase().includes('net') || row[0]?.toLowerCase().includes('total');
              return (
                <tr key={i} className={`border-t border-slate-100 ${isTotal ? 'bg-emerald-50 font-bold' : 'hover:bg-slate-50'}`}>
                  {row.map((cell, j) => (
                    <td key={j} className={`px-4 py-3 text-xs ${j === 0 ? 'font-medium text-slate-900' : 'text-slate-600'} ${isTotal ? 'text-emerald-800' : ''}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionWrapper>
  );
};

const JourneySection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const subs = section.subsections || [];
  if (subs.length === 0) {
    const table = parseMarkdownTable(section.content);
    if (table.headers.length > 0) return <TableSection section={section} />;
    return <GenericSection section={section} />;
  }

  const stageColors = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500'];

  return (
    <SectionWrapper section={section}>
      <div className="flex flex-col gap-3">
        {subs.map((sub, i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-10 h-10 rounded-full ${stageColors[i % stageColors.length]} flex items-center justify-center text-white text-xs font-bold shadow`}>
                {i + 1}
              </div>
              {i < subs.length - 1 && <div className="w-0.5 h-8 bg-slate-200 mt-1" />}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1">
              <h4 className="font-bold text-slate-900 text-sm mb-2">{sub.title}</h4>
              <ul className="space-y-1">
                {extractBullets(sub.content).map((b, j) => (
                  <li key={j} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <ArrowRight className="w-3 h-3 mt-0.5 text-slate-400 flex-shrink-0" />{b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};

const ArchitectureSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const kvs = extractKeyValues(section.content);
  const bullets = extractBullets(section.content);
  // Extract code blocks
  const codeMatch = section.content.match(/```[\s\S]*?```/);
  const codeContent = codeMatch ? codeMatch[0].replace(/```\w*\n?/g, '').trim() : '';

  return (
    <SectionWrapper section={section}>
      {codeContent && (
        <div className="bg-slate-900 rounded-xl p-6 mb-5 font-mono text-sm text-emerald-400 overflow-x-auto shadow-inner">
          <pre className="whitespace-pre leading-relaxed">{codeContent}</pre>
        </div>
      )}
      {kvs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {kvs.map((kv, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block mb-1">{kv.key}</span>
              <span className="text-sm text-slate-800">{kv.value}</span>
            </div>
          ))}
        </div>
      )}
      {bullets.length > 0 && (
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
              <Zap className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />{b}
            </li>
          ))}
        </ul>
      )}
    </SectionWrapper>
  );
};

const TableSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const table = parseMarkdownTable(section.content);
  if (table.headers.length === 0) return <GenericSection section={section} />;

  return (
    <SectionWrapper section={section}>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              {table.headers.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-3 text-xs ${j === 0 ? 'font-medium text-slate-900' : 'text-slate-600'}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionWrapper>
  );
};

const AppendixSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="bg-slate-100 p-2 rounded-lg">
          <BookOpen className="w-5 h-5 text-slate-600" />
        </div>
        <h3 className="font-bold text-slate-900 flex-1">{section.title}</h3>
        {open ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-slate-100 pt-4 overflow-hidden">
          <div className="prose prose-sm prose-slate max-w-none break-words overflow-hidden prose-table:text-xs prose-th:bg-slate-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2">
            <ReactMarkdown>{section.content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Wrapper & Generic ─────────────────────────────────────────────────────

const SectionWrapper: React.FC<{ section: ReportSection; children: React.ReactNode }> = ({ section, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className={`bg-gradient-to-r ${SECTION_COLORS[section.type]} px-6 py-4 flex items-center gap-3`}>
      <div className="bg-white/20 p-2 rounded-lg text-white flex-shrink-0">
        {SECTION_ICONS[section.type]}
      </div>
      <h3 className="text-lg font-bold text-white break-words min-w-0">{section.title}</h3>
    </div>
    <div className="p-6 min-w-0 overflow-hidden">{children}</div>
  </div>
);

const GenericSection: React.FC<{ section: ReportSection }> = ({ section }) => (
  <SectionWrapper section={section}>
    <div className="prose prose-sm prose-slate max-w-none break-words overflow-hidden prose-table:text-xs prose-th:bg-slate-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2">
      <ReactMarkdown>{section.content}</ReactMarkdown>
    </div>
  </SectionWrapper>
);

// ─── Section Router ────────────────────────────────────────────────────────

const SectionRenderer: React.FC<{ section: ReportSection }> = ({ section }) => {
  switch (section.type) {
    case 'hero': return <HeroSection section={section} />;
    case 'kpi': return <KPISection section={section} />;
    case 'capabilities': return <CapabilitiesSection section={section} />;
    case 'journey': return <JourneySection section={section} />;
    case 'architecture': return <ArchitectureSection section={section} />;
    case 'financial': return <FinancialSection section={section} />;
    case 'roadmap': return <RoadmapSection section={section} />;
    case 'risks': return <RiskSection section={section} />;
    case 'impact': return <KPISection section={section} />;
    case 'recommendations': return <KPISection section={section} />;
    case 'appendix': return <AppendixSection section={section} />;
    case 'swot':
    case 'porters':
    case 'systems':
    case 'requirements':
      return <TableSection section={section} />;
    default: return <GenericSection section={section} />;
  }
};

// ─── Main Report Dashboard ────────────────────────────────────────────────

interface ReportDashboardProps {
  markdown: string;
}

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ markdown }) => {
  const report = parseReport(markdown);
  const [activeSection, setActiveSection] = useState<string>('');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Scroll to section on TOC click
  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-100px 0px -60% 0px' }
    );

    Object.values(sectionRefs.current).forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [report.sections]);

  if (report.sections.length === 0) {
    return (
      <div className="prose prose-slate max-w-none">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 overflow-hidden">
      {/* Report title */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">{report.title}</h1>
        <p className="text-sm text-slate-400 mt-1">{report.sections.length} sections generated</p>
      </div>

      {/* Step indicator — wrapping nav pills */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-100 -mx-2 px-2 py-2">
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
          {report.sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              className={`flex items-center gap-1.5 px-2.5 md:px-4 py-1.5 md:py-2 rounded-full text-[11px] md:text-xs font-semibold transition-all ${
                activeSection === s.id
                  ? 'bg-accent-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              <span className="opacity-80 hidden sm:block">{SECTION_ICONS[s.type]}</span>
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sections — full width */}
      {report.sections.map((section) => (
        <div
          key={section.id}
          id={section.id}
          ref={(el) => { sectionRefs.current[section.id] = el; }}
        >
          <SectionRenderer section={section} />
        </div>
      ))}
    </div>
  );
};
