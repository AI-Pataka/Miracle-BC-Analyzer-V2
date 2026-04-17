import React, { useState, useRef, useEffect } from 'react';
import {
  Target, BarChart3, Layers, Route, Server, DollarSign,
  Calendar, AlertTriangle, Grid3X3, Shield, Lightbulb,
  ClipboardList, ChevronDown, ChevronRight, FileText,
  TrendingUp, Zap, CheckCircle2, ArrowRight, BookOpen,
  TrendingDown, Minus,
} from 'lucide-react';
import {
  parseReport, parseMarkdownTable, extractBullets, extractKeyValues,
  extractKPIs, extractSwotQuadrants, extractPortersForces, stripMarkdown,
  type ReportSection, type SectionType,
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

// ─── Plain content renderer (no ReactMarkdown) ─────────────────────────────

const PlainContent: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => {
  const lines = content.split('\n').filter(l => l.trim());
  return (
    <div className={`space-y-2 ${className}`}>
      {lines.map((line, i) => {
        if (/^#+\s/.test(line)) return null; // skip section headings
        if (/^\s*[-*•✅]\s/.test(line)) {
          return (
            <div key={i} className="flex items-start gap-2">
              <ArrowRight className="w-3 h-3 mt-1 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-700 leading-relaxed">
                {stripMarkdown(line.replace(/^\s*[-*•✅]\s+/, ''))}
              </span>
            </div>
          );
        }
        const clean = stripMarkdown(line);
        if (!clean) return null;
        return <p key={i} className="text-sm text-slate-700 leading-relaxed">{clean}</p>;
      })}
    </div>
  );
};

// ─── Section Wrapper ───────────────────────────────────────────────────────

const SectionWrapper: React.FC<{
  section: ReportSection;
  children: React.ReactNode;
  noHeader?: boolean;
}> = ({ section, children, noHeader }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    {!noHeader && (
      <div className={`bg-gradient-to-r ${SECTION_COLORS[section.type]} px-6 py-4 flex items-center gap-3`}>
        <div className="bg-white/20 p-2 rounded-lg text-white flex-shrink-0">
          {SECTION_ICONS[section.type]}
        </div>
        <h3 className="text-lg font-bold text-white break-words min-w-0">{stripMarkdown(section.title)}</h3>
      </div>
    )}
    <div className="p-6 min-w-0 overflow-hidden">{children}</div>
  </div>
);

// ─── Hero Section ──────────────────────────────────────────────────────────

const HeroSection: React.FC<{ section: ReportSection }> = ({ section }) => (
  <div className="bg-gradient-to-br from-accent-600 to-violet-700 rounded-2xl p-6 md:p-8 text-white shadow-lg overflow-hidden">
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-white/20 p-2.5 rounded-xl flex-shrink-0">
        <Target className="w-6 h-6" />
      </div>
      <h2 className="text-xl md:text-2xl font-bold break-words min-w-0">{stripMarkdown(section.title)}</h2>
    </div>
    <div className="text-white/90 leading-relaxed text-sm md:text-base break-words space-y-2">
      {section.content.split('\n').filter(l => l.trim() && !/^#+/.test(l)).map((line, i) => (
        <p key={i}>{stripMarkdown(line)}</p>
      ))}
    </div>
  </div>
);

// ─── KPI Section — detailed cards ─────────────────────────────────────────

const KPISection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const detailedKPIs = extractKPIs(section.content);

  if (detailedKPIs.length === 0) {
    const bullets = extractBullets(section.content);
    const colors = [
      'bg-emerald-50 border-emerald-200',
      'bg-blue-50 border-blue-200',
      'bg-violet-50 border-violet-200',
      'bg-amber-50 border-amber-200',
      'bg-rose-50 border-rose-200',
      'bg-cyan-50 border-cyan-200',
    ];
    if (bullets.length === 0) return <GenericSection section={section} />;
    return (
      <SectionWrapper section={section}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bullets.map((kpi, i) => (
            <div key={i} className={`rounded-xl p-5 border ${colors[i % colors.length]}`}>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-emerald-600" />
                <p className="text-sm font-medium leading-relaxed text-slate-800">{kpi}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>
    );
  }

  const accentColors = [
    { bg: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
    { bg: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
    { bg: 'bg-violet-500', light: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-800' },
    { bg: 'bg-amber-500', light: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
    { bg: 'bg-rose-500', light: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-800' },
    { bg: 'bg-cyan-500', light: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-800' },
  ];

  return (
    <SectionWrapper section={section}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {detailedKPIs.map((kpi, i) => {
          const c = accentColors[i % accentColors.length];
          return (
            <div key={i} className={`rounded-2xl border ${c.border} ${c.light} overflow-hidden`}>
              <div className={`${c.bg} px-4 py-3`}>
                <p className="text-white font-bold text-sm leading-tight">{kpi.name}</p>
              </div>
              <div className="px-4 py-4 space-y-3">
                {kpi.current && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Current State</p>
                    <p className="text-sm text-slate-700 leading-snug">{kpi.current}</p>
                  </div>
                )}
                {kpi.target && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Target</p>
                    <p className={`text-sm font-semibold ${c.text} leading-snug`}>{kpi.target}</p>
                  </div>
                )}
                {kpi.gap && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Gap to Close</p>
                    <p className="text-sm text-slate-600 leading-snug">{kpi.gap}</p>
                  </div>
                )}
                {(kpi.timeframe || kpi.owner) && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200">
                    {kpi.timeframe && (
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
                        ⏱ {kpi.timeframe}
                      </span>
                    )}
                    {kpi.owner && (
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        👤 {kpi.owner}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SectionWrapper>
  );
};

// ─── SWOT Section — 4-quadrant visual ─────────────────────────────────────

const SwotSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const swot = extractSwotQuadrants(section.content);
  const hasData = swot.strengths.length + swot.weaknesses.length + swot.opportunities.length + swot.threats.length > 0;
  if (!hasData) return <GenericSection section={section} />;

  const quadrants = [
    {
      label: 'Strengths',
      items: swot.strengths,
      icon: <TrendingUp className="w-4 h-4" />,
      headerClass: 'bg-emerald-600',
      bodyClass: 'bg-emerald-50',
      dotClass: 'bg-emerald-500',
    },
    {
      label: 'Weaknesses',
      items: swot.weaknesses,
      icon: <TrendingDown className="w-4 h-4" />,
      headerClass: 'bg-rose-500',
      bodyClass: 'bg-rose-50',
      dotClass: 'bg-rose-400',
    },
    {
      label: 'Opportunities',
      items: swot.opportunities,
      icon: <Lightbulb className="w-4 h-4" />,
      headerClass: 'bg-blue-600',
      bodyClass: 'bg-blue-50',
      dotClass: 'bg-blue-500',
    },
    {
      label: 'Threats',
      items: swot.threats,
      icon: <AlertTriangle className="w-4 h-4" />,
      headerClass: 'bg-amber-500',
      bodyClass: 'bg-amber-50',
      dotClass: 'bg-amber-400',
    },
  ];

  return (
    <SectionWrapper section={section}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quadrants.map((q) => (
          <div key={q.label} className="rounded-xl overflow-hidden border border-slate-200">
            <div className={`${q.headerClass} px-4 py-2.5 flex items-center gap-2`}>
              <span className="text-white">{q.icon}</span>
              <span className="text-white font-bold text-sm">{q.label}</span>
              <span className="ml-auto text-white/70 text-xs">{q.items.length}</span>
            </div>
            <div className={`${q.bodyClass} p-4 space-y-2 min-h-[100px]`}>
              {q.items.length === 0 ? (
                <p className="text-xs text-slate-400 italic">None identified</p>
              ) : (
                q.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${q.dotClass}`} />
                    <p className="text-sm text-slate-700 leading-snug">{item}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};

// ─── Porter's Five Forces Section ─────────────────────────────────────────

const PortersSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const forces = extractPortersForces(section.content);
  if (forces.length === 0) return <GenericSection section={section} />;

  const forceColors = [
    'border-l-blue-500',
    'border-l-violet-500',
    'border-l-emerald-500',
    'border-l-amber-500',
    'border-l-rose-500',
  ];

  return (
    <SectionWrapper section={section}>
      <div className="space-y-3">
        {forces.map((f, i) => (
          <div key={i} className={`bg-slate-50 rounded-xl border border-slate-200 border-l-4 ${forceColors[i % forceColors.length]} p-4`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <h4 className="font-bold text-slate-900 text-sm">{f.name}</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{f.analysis}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};

// ─── Recommendations Section ───────────────────────────────────────────────

const RecommendationsSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const bullets = extractBullets(section.content);
  if (bullets.length === 0) return <GenericSection section={section} />;

  return (
    <SectionWrapper section={section}>
      <div className="space-y-3">
        {bullets.map((rec, i) => (
          <div key={i} className="flex items-start gap-4 bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <p className="text-sm text-slate-800 leading-relaxed">{rec}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};

// ─── Value-Stream Capability Matrix ────────────────────────────────────────

interface MatrixCapability {
  name: string;
  description: string;
  isNew: boolean;
}

interface MatrixStage {
  stage: string;
  outcomes: string[];
  capabilities: MatrixCapability[];
  technologies: string[];
  channels: string[];
}

function buildCapabilityMatrix(content: string): MatrixStage[] | null {
  const table = parseMarkdownTable(content);
  if (table.headers.length === 0 || table.rows.length === 0) return null;

  const findIdx = (re: RegExp) =>
    table.headers.findIndex(h => re.test(h.replace(/\*/g, '').trim()));

  const stageIdx = findIdx(/value\s*stage|stage/i);
  const outcomeIdx = findIdx(/outcome/i);
  const l4Idx = findIdx(/l4\s*capability|^capability$|l4/i);
  const descIdx = findIdx(/capability\s*description|description/i);
  const techIdx = findIdx(/technology|tech/i);
  const channelIdx = findIdx(/channel/i);

  if (stageIdx < 0 || l4Idx < 0) return null;

  const map = new Map<string, MatrixStage>();
  const order: string[] = [];

  const pushUnique = (arr: string[], v: string) => {
    const clean = stripMarkdown(v).trim();
    if (clean && !arr.includes(clean)) arr.push(clean);
  };

  for (const row of table.rows) {
    const stage = stripMarkdown(row[stageIdx] || '').trim();
    if (!stage) continue;

    if (!map.has(stage)) {
      map.set(stage, { stage, outcomes: [], capabilities: [], technologies: [], channels: [] });
      order.push(stage);
    }
    const bucket = map.get(stage)!;

    if (outcomeIdx >= 0) pushUnique(bucket.outcomes, row[outcomeIdx] || '');

    const rawName = (row[l4Idx] || '').trim();
    if (rawName) {
      const isNew = /\(\s*new\s*\)/i.test(rawName);
      const name = stripMarkdown(rawName.replace(/\(\s*new\s*\)/gi, '').trim());
      const desc = descIdx >= 0 ? stripMarkdown(row[descIdx] || '').trim() : '';
      if (name && !bucket.capabilities.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        bucket.capabilities.push({ name, description: desc, isNew });
      }
    }

    if (techIdx >= 0) {
      const techs = (row[techIdx] || '').split(/[,;/]/).map(s => s.trim()).filter(Boolean);
      techs.forEach(t => pushUnique(bucket.technologies, t));
    }
    if (channelIdx >= 0) {
      const chans = (row[channelIdx] || '').split(/[,;/]/).map(s => s.trim()).filter(Boolean);
      chans.forEach(c => pushUnique(bucket.channels, c));
    }
  }

  return order.map(s => map.get(s)!);
}

const CapabilityMatrixView: React.FC<{ stages: MatrixStage[]; title: string }> = ({ stages, title }) => {
  const cols = stages.length;
  const gridTemplate = `160px repeat(${cols}, minmax(220px, 1fr))`;

  const RowLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-3 flex items-center sticky left-0 z-10">
      {children}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-slate-500" />
          {title}
        </h4>
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border-2 border-emerald-500 bg-emerald-50" />
            <span className="text-slate-600 font-medium">New Capability</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border-2 border-accent-500 bg-accent-50" />
            <span className="text-slate-600 font-medium">Incedo Capability</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <div className="grid min-w-max" style={{ gridTemplateColumns: gridTemplate }}>
          <RowLabel>Value Stages</RowLabel>
          {stages.map((s, i) => (
            <div key={`stage-${i}`} className="bg-slate-800 text-white px-3 py-3 text-sm font-bold text-center border-l border-slate-700">
              {s.stage}
            </div>
          ))}

          <RowLabel>Stage Outcomes</RowLabel>
          {stages.map((s, i) => (
            <div key={`out-${i}`} className="bg-accent-50 px-3 py-3 text-[11px] text-slate-700 leading-snug border-l border-slate-200 border-t border-slate-200">
              {s.outcomes.length ? s.outcomes.join(' · ') : <span className="text-slate-400 italic">—</span>}
            </div>
          ))}

          <RowLabel>Capabilities</RowLabel>
          {stages.map((s, i) => (
            <div key={`cap-${i}`} className="bg-white px-2 py-2 space-y-1.5 border-l border-slate-200 border-t border-slate-200">
              {s.capabilities.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic px-1 py-2">No capabilities</div>
              ) : (
                s.capabilities.map((c, j) => (
                  <div
                    key={j}
                    className={`rounded-md border-2 px-2 py-1.5 ${
                      c.isNew
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-accent-500 bg-accent-50'
                    }`}
                    title={c.description}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className={`text-[11px] font-bold leading-tight ${c.isNew ? 'text-emerald-800' : 'text-accent-800'}`}>
                        {c.name}
                      </p>
                    </div>
                    {c.description && (
                      <p className="text-[10px] text-slate-600 leading-snug mt-0.5 line-clamp-3">
                        {c.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          ))}

          <RowLabel>Technology</RowLabel>
          {stages.map((s, i) => (
            <div key={`tech-${i}`} className="bg-slate-50 px-3 py-2.5 text-[11px] text-slate-700 leading-snug border-l border-slate-200 border-t border-slate-200">
              {s.technologies.length ? s.technologies.join(', ') : <span className="text-slate-400 italic">—</span>}
            </div>
          ))}

          <RowLabel>Channels</RowLabel>
          {stages.map((s, i) => (
            <div key={`ch-${i}`} className="bg-accent-600 text-white px-3 py-2.5 text-[11px] font-medium leading-snug border-l border-accent-500 border-t border-slate-200">
              {s.channels.length ? s.channels.join(', ') : <span className="text-white/60 italic">—</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Capabilities Section ──────────────────────────────────────────────────

const CapabilitiesSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const matrix = buildCapabilityMatrix(section.content);
  if (matrix && matrix.length > 0) {
    return (
      <SectionWrapper section={section}>
        <CapabilityMatrixView stages={matrix} title={stripMarkdown(section.title)} />
      </SectionWrapper>
    );
  }

  const subs = section.subsections || [];
  if (subs.length === 0) return <GenericSection section={section} />;

  return (
    <SectionWrapper section={section}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subs.map((sub, i) => {
          const kvs = extractKeyValues(sub.content);
          const isNew = /\(NEW\)/i.test(sub.title);
          const isEnhance = /\(ENHANCE\)/i.test(sub.title);
          const cleanTitle = stripMarkdown(sub.title.replace(/^\d+\.\s*/, '').replace(/\s*\(NEW\)|\(ENHANCE\)/gi, ''));
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow overflow-hidden">
              <div className="flex items-start justify-between mb-3 min-w-0">
                <h4 className="font-bold text-slate-900 text-sm leading-tight pr-2 break-words min-w-0">{cleanTitle}</h4>
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
                      <ArrowRight className="w-3 h-3 mt-0.5 text-slate-400 flex-shrink-0" />{b}
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

// ─── Roadmap Section ───────────────────────────────────────────────────────

const RoadmapSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const subs = section.subsections || [];
  if (subs.length === 0) return <GenericSection section={section} />;

  const phaseColors = ['border-blue-400 bg-blue-50', 'border-violet-400 bg-violet-50', 'border-emerald-400 bg-emerald-50', 'border-amber-400 bg-amber-50'];
  const dotColors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500'];

  return (
    <SectionWrapper section={section}>
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
        <div className="space-y-6">
          {subs.map((sub, i) => (
            <div key={i} className="relative flex gap-5">
              <div className={`w-12 h-12 rounded-full ${dotColors[i % dotColors.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 z-10 shadow-md`}>
                {i + 1}
              </div>
              <div className={`flex-1 rounded-xl border-l-4 ${phaseColors[i % phaseColors.length]} p-5`}>
                <h4 className="font-bold text-slate-900 text-sm mb-2">{stripMarkdown(sub.title)}</h4>
                <ul className="space-y-1.5">
                  {extractBullets(sub.content).map((b, j) => (
                    <li key={j} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <ArrowRight className="w-3 h-3 mt-0.5 text-slate-400 flex-shrink-0" />{b}
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
    </SectionWrapper>
  );
};

// ─── Risk Section ──────────────────────────────────────────────────────────

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
              <h4 className="font-bold text-slate-900 text-sm">{stripMarkdown(row[0] || '')}</h4>
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
            {row[3] && <p className="text-xs text-slate-600"><span className="font-semibold">Mitigation:</span> {stripMarkdown(row[3])}</p>}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};

// ─── Financial Section ─────────────────────────────────────────────────────

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
                <th key={i} className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">{stripMarkdown(h)}</th>
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
                      {stripMarkdown(cell)}
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

// ─── Journey Section ───────────────────────────────────────────────────────

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
              <h4 className="font-bold text-slate-900 text-sm mb-2">{stripMarkdown(sub.title)}</h4>
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

// ─── Architecture Section ──────────────────────────────────────────────────

const ArchitectureSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const kvs = extractKeyValues(section.content);
  const bullets = extractBullets(section.content);
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
      {kvs.length === 0 && bullets.length === 0 && !codeContent && (
        <PlainContent content={section.content} />
      )}
    </SectionWrapper>
  );
};

// ─── Table Section ─────────────────────────────────────────────────────────

const TableSection: React.FC<{ section: ReportSection; noHeader?: boolean }> = ({ section, noHeader }) => {
  const table = parseMarkdownTable(section.content);
  if (table.headers.length === 0) return <GenericSection section={section} />;

  return (
    <SectionWrapper section={section} noHeader={noHeader}>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              {table.headers.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  {stripMarkdown(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-3 text-xs ${j === 0 ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                    {stripMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionWrapper>
  );
};

// ─── Appendix Section (collapsible) ───────────────────────────────────────

const AppendixSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const [open, setOpen] = useState(false);
  const table = parseMarkdownTable(section.content);
  const bullets = extractBullets(section.content);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="bg-slate-100 p-2 rounded-lg">
          <BookOpen className="w-5 h-5 text-slate-600" />
        </div>
        <h3 className="font-bold text-slate-900 flex-1">{stripMarkdown(section.title)}</h3>
        {open ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-slate-100 pt-4 overflow-hidden space-y-4">
          {table.headers.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {table.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left text-xs font-bold text-slate-600 uppercase tracking-wide border-b border-slate-200">
                        {stripMarkdown(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      {row.map((cell, j) => (
                        <td key={j} className={`px-3 py-2 text-xs ${j === 0 ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                          {stripMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : bullets.length > 0 ? (
            <ul className="space-y-2">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <ArrowRight className="w-3 h-3 mt-1 text-slate-400 flex-shrink-0" />{b}
                </li>
              ))}
            </ul>
          ) : (
            <PlainContent content={section.content} />
          )}
        </div>
      )}
    </div>
  );
};

// ─── Generic Section ───────────────────────────────────────────────────────

const GenericSection: React.FC<{ section: ReportSection }> = ({ section }) => {
  const table = parseMarkdownTable(section.content);
  const bullets = extractBullets(section.content);

  return (
    <SectionWrapper section={section}>
      {table.headers.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {table.headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    {stripMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className={`px-4 py-3 text-xs ${j === 0 ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                      {stripMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : bullets.length > 0 ? (
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <ArrowRight className="w-3 h-3 mt-1 text-slate-400 flex-shrink-0" />{b}
            </li>
          ))}
        </ul>
      ) : (
        <PlainContent content={section.content} />
      )}
    </SectionWrapper>
  );
};

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
    case 'swot': return <SwotSection section={section} />;
    case 'porters': return <PortersSection section={section} />;
    case 'impact': return <KPISection section={section} />;
    case 'recommendations': return <RecommendationsSection section={section} />;
    case 'appendix': return <AppendixSection section={section} />;
    case 'systems':
      // Slide 12 "Capability-to-System Mapping" — no title header
      return <TableSection section={section} noHeader={/capability.*system/i.test(section.title)} />;
    case 'requirements':
      return <TableSection section={section} />;
    default: return <GenericSection section={section} />;
  }
};

// ─── Main Report Dashboard ─────────────────────────────────────────────────

interface ReportDashboardProps {
  markdown: string;
}

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ markdown }) => {
  const report = parseReport(markdown);
  const [activeSection, setActiveSection] = useState<string>('');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (report.sections.length > 0 && !activeSection) {
      setActiveSection(report.sections[0].id);
    }
  }, [report.sections]);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );
    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [report.sections]);

  if (report.sections.length === 0) {
    return <PlainContent content={markdown} />;
  }

  return (
    <div className="space-y-5 min-w-0 overflow-hidden">
      {/* Compact section dropdown nav */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 flex items-center gap-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Jump to</span>
        <select
          title="Jump to section"
          value={activeSection}
          onChange={(e) => scrollToSection(e.target.value)}
          className="flex-1 text-sm font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-400 cursor-pointer"
        >
          {report.sections.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
        <span className="text-[10px] text-slate-400 flex-shrink-0 hidden sm:block">{report.sections.length} sections</span>
      </div>

      {/* Sections */}
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
