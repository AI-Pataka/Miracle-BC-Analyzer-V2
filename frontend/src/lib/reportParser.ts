/**
 * Report Parser — transforms raw Markdown report into structured sections
 * for rendering as a premium SaaS dashboard.
 */

export type SectionType =
  | 'hero'
  | 'kpi'
  | 'capabilities'
  | 'journey'
  | 'architecture'
  | 'financial'
  | 'roadmap'
  | 'risks'
  | 'swot'
  | 'porters'
  | 'recommendations'
  | 'impact'
  | 'requirements'
  | 'systems'
  | 'appendix'
  | 'generic';

export interface ReportSection {
  id: string;
  title: string;
  type: SectionType;
  content: string;
  subsections?: { title: string; content: string }[];
}

export interface ParsedReport {
  title: string;
  sections: ReportSection[];
}

// Map heading keywords to section types
const TYPE_MATCHERS: [RegExp, SectionType][] = [
  [/executive\s*summary|problem\s*statement|overview/i, 'hero'],
  [/kpi|key\s*performance|success\s*metric/i, 'kpi'],
  [/capabilit(?:y|ies)\s*(?:required|design|matrix|map)/i, 'capabilities'],
  [/journey\s*map|customer\s*journey|journey.*capability/i, 'journey'],
  [/technical\s*architecture|architecture|system\s*design/i, 'architecture'],
  [/financial\s*impact|financial\s*evaluat|cost.*benefit/i, 'financial'],
  [/(?:implementation\s*)?roadmap|phase\s*\d|timeline/i, 'roadmap'],
  [/risk|mitigation/i, 'risks'],
  [/swot/i, 'swot'],
  [/porter/i, 'porters'],
  [/recommend|strategic\s*recommend|action/i, 'recommendations'],
  [/business\s*impact|impact\s*analysis/i, 'impact'],
  [/requirement|business\s*requirement/i, 'requirements'],
  [/system.*(?:map|action)|product.*map|capability.*system/i, 'systems'],
  [/appendix/i, 'appendix'],
];

function classifySection(title: string): SectionType {
  for (const [pattern, type] of TYPE_MATCHERS) {
    if (pattern.test(title)) return type;
  }
  return 'generic';
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Parse a Markdown report into structured sections.
 * Splits on ## headings (H2) and classifies each section.
 */
export function parseReport(markdown: string): ParsedReport {
  if (!markdown || !markdown.trim()) {
    return { title: 'Report', sections: [] };
  }

  const lines = markdown.split('\n');
  let reportTitle = 'Business Capability Analysis Report';
  const sections: ReportSection[] = [];
  let currentSection: ReportSection | null = null;
  let contentLines: string[] = [];

  const flushSection = () => {
    if (currentSection) {
      currentSection.content = contentLines.join('\n').trim();
      // Extract subsections (### headings)
      currentSection.subsections = extractSubsections(currentSection.content);
      sections.push(currentSection);
      contentLines = [];
    }
  };

  for (const line of lines) {
    // H1 — report title
    const h1Match = line.match(/^#\s+(.+)/);
    if (h1Match && !line.startsWith('##')) {
      reportTitle = h1Match[1].trim();
      continue;
    }

    // H2 — new section
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      flushSection();
      const rawTitle = h2Match[1].trim();
      // Strip "Slide X:" prefixes like "Slide 1: Problem Statement"
      const title = rawTitle.replace(/^Slide\s*\d+\s*[:.\-–—]\s*/i, '');
      currentSection = {
        id: slugify(title),
        title,
        type: classifySection(title),
        content: '',
      };
      continue;
    }

    // Horizontal rule — skip (used as separator)
    if (/^---+\s*$/.test(line)) continue;

    contentLines.push(line);
  }

  flushSection();

  // If no H2 sections found, treat entire content as a single section
  if (sections.length === 0 && markdown.trim()) {
    sections.push({
      id: 'report',
      title: reportTitle,
      type: 'generic',
      content: markdown,
    });
  }

  return { title: reportTitle, sections };
}

function extractSubsections(content: string): { title: string; content: string }[] {
  const subs: { title: string; content: string }[] = [];
  const lines = content.split('\n');
  let currentTitle = '';
  let currentContent: string[] = [];

  const flush = () => {
    if (currentTitle) {
      subs.push({ title: currentTitle, content: currentContent.join('\n').trim() });
      currentContent = [];
    }
  };

  for (const line of lines) {
    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match) {
      flush();
      currentTitle = h3Match[1].trim();
      continue;
    }
    if (currentTitle) {
      currentContent.push(line);
    }
  }
  flush();

  return subs;
}

/**
 * Extract a Markdown table from content and return as rows.
 */
export function parseMarkdownTable(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] =>
    line.split('|').map(c => c.trim()).filter(c => c !== '');

  const headers = parseLine(lines[0]);
  // Skip separator line (---|---|---)
  const rows = lines.slice(2).map(parseLine);

  return { headers, rows };
}

/**
 * Extract bullet points from content.
 */
export function extractBullets(content: string): string[] {
  return content
    .split('\n')
    .filter(l => /^\s*[-*✅•]\s+/.test(l))
    .map(l => l.replace(/^\s*[-*✅•]\s+/, '').trim());
}

/**
 * Extract key-value pairs from bold content like "**Key:** Value"
 */
export function extractKeyValues(content: string): { key: string; value: string }[] {
  const pairs: { key: string; value: string }[] = [];
  const regex = /\*\*(.+?):\*\*\s*(.+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    pairs.push({ key: match[1].trim(), value: match[2].trim() });
  }
  return pairs;
}
