import type { DateRange } from '../../domain/schedule';
import type { Project } from '../../domain/types';
import {
  ITALIAN_MONTHS_SHORT,
  addMonthsIso,
  diffDays,
  endOfMonth,
  startOfMonth,
} from '../../utils/dateUtils';

/** How much time the roadmap shows at once: months, quarters or years in view. */
export type RoadmapZoom = 'months' | 'quarters' | 'years';

export const ROADMAP_ZOOMS: readonly RoadmapZoom[] = ['months', 'quarters', 'years'];

export const ROADMAP_ZOOM_LABELS: Record<RoadmapZoom, { label: string; title: string }> = {
  months: { label: 'Mesi', title: 'Un mese per colonna, larga' },
  quarters: { label: 'Trimestri', title: 'Un mese per colonna, stretta' },
  years: { label: 'Anni', title: 'Un trimestre per colonna' },
};

/** Pixels per day at each zoom: a month is about 240, 90 or 30 pixels wide. */
export const ROADMAP_DAY_WIDTH: Record<RoadmapZoom, number> = {
  months: 8,
  quarters: 3,
  years: 1,
};

/**
 * Months the roadmap shows before today, and after today or the last project, whichever is later:
 * more when zoomed out, so that the years fill the screen.
 */
const MONTHS_BEFORE: Record<RoadmapZoom, number> = { months: 6, quarters: 6, years: 18 };
const MONTHS_AFTER: Record<RoadmapZoom, number> = { months: 18, quarters: 18, years: 42 };
/** Room around the first and the last project, to move them further. */
const MARGIN_MONTHS = 6;

function startOfQuarter(iso: string): string {
  const month = Number(iso.slice(5, 7)) - 1;
  return `${iso.slice(0, 4)}-${String(month - (month % 3) + 1).padStart(2, '0')}-01`;
}

function endOfQuarter(iso: string): string {
  return endOfMonth(addMonthsIso(startOfQuarter(iso), 2));
}

/**
 * The days of the roadmap, in whole quarters: from half a year before today, or before the first
 * project, to a year and a half after today, or after the last project, with room to move them.
 * Zoomed out to years, it goes further both ways.
 */
export function roadmapRange(
  projects: readonly Project[],
  today: string,
  zoom: RoadmapZoom,
): DateRange {
  let start = addMonthsIso(today, -MONTHS_BEFORE[zoom]);
  let end = addMonthsIso(today, MONTHS_AFTER[zoom]);
  for (const project of projects) {
    const before = addMonthsIso(project.startDate, -MARGIN_MONTHS);
    const after = addMonthsIso(project.endDate, MARGIN_MONTHS);
    if (before < start) start = before;
    if (after > end) end = after;
  }
  return { start: startOfQuarter(start), end: endOfQuarter(end) };
}

/** A column of the roadmap: a month, or a quarter when zoomed out to years. */
export interface RoadmapColumn {
  start: string;
  end: string;
  /** "gen", or "T1". */
  label: string;
  /** "gennaio 2027", or "primo trimestre 2027", for screen readers and tooltips. */
  name: string;
  /** Pixels from the start of the range. */
  left: number;
  width: number;
  /** All of its days are before today. */
  past: boolean;
  /** It holds today. */
  current: boolean;
  /** The last of its year, where the roadmap draws a stronger line. */
  yearEnd: boolean;
}

const QUARTER_NAMES = ['primo', 'secondo', 'terzo', 'quarto'];

/** The columns of the range at a zoom: months, or quarters for years. */
export function roadmapColumns(
  range: DateRange,
  zoom: RoadmapZoom,
  today: string,
): RoadmapColumn[] {
  const dayWidth = ROADMAP_DAY_WIDTH[zoom];
  const step = zoom === 'years' ? 3 : 1;
  const columns: RoadmapColumn[] = [];
  for (let start = range.start; start <= range.end; start = addMonthsIso(start, step)) {
    const end = step === 3 ? endOfQuarter(start) : endOfMonth(start);
    const month = Number(start.slice(5, 7)) - 1;
    const year = start.slice(0, 4);
    const quarter = Math.floor(month / 3);
    columns.push({
      start,
      end,
      label: step === 3 ? `T${quarter + 1}` : (ITALIAN_MONTHS_SHORT[month] ?? ''),
      name:
        step === 3
          ? `${QUARTER_NAMES[quarter] ?? ''} trimestre ${year}`
          : `${ITALIAN_MONTHS_SHORT[month] ?? ''} ${year}`,
      left: diffDays(range.start, start) * dayWidth,
      width: (diffDays(start, end) + 1) * dayWidth,
      past: end < today,
      current: start <= today && today <= end,
      yearEnd: end.endsWith('-12-31'),
    });
  }
  return columns;
}

/** A year of the range, placed in pixels. */
export interface YearSpan {
  year: string;
  left: number;
  width: number;
}

export function yearSpans(range: DateRange, dayWidth: number): YearSpan[] {
  const spans: YearSpan[] = [];
  for (let year = Number(range.start.slice(0, 4)); year <= Number(range.end.slice(0, 4)); year++) {
    const first = `${year}-01-01` < range.start ? range.start : `${year}-01-01`;
    const last = `${year}-12-31` > range.end ? range.end : `${year}-12-31`;
    spans.push({
      year: String(year),
      left: diffDays(range.start, first) * dayWidth,
      width: (diffDays(first, last) + 1) * dayWidth,
    });
  }
  return spans;
}

/** Where the bar of a project goes, in pixels from the start of the range. */
export function barPlace(
  project: Pick<Project, 'startDate' | 'endDate'>,
  range: DateRange,
  dayWidth: number,
): { left: number; width: number } {
  return {
    left: diffDays(range.start, project.startDate) * dayWidth,
    width: (diffDays(project.startDate, project.endDate) + 1) * dayWidth,
  };
}

/**
 * "nov 2026 – feb 2027", "set – dic 2026" in the same year, "gen 2026" in the same month: the
 * months a project spans.
 */
export function projectPeriod(project: Pick<Project, 'startDate' | 'endDate'>): string {
  const month = (iso: string) => ITALIAN_MONTHS_SHORT[Number(iso.slice(5, 7)) - 1] ?? '';
  const startYear = project.startDate.slice(0, 4);
  const endYear = project.endDate.slice(0, 4);
  if (project.startDate.slice(0, 7) === project.endDate.slice(0, 7)) {
    return `${month(project.endDate)} ${endYear}`;
  }
  return startYear === endYear
    ? `${month(project.startDate)} – ${month(project.endDate)} ${endYear}`
    : `${month(project.startDate)} ${startYear} – ${month(project.endDate)} ${endYear}`;
}

/** The project that a new one starts from: the period clicked, or three months from today. */
export function newProjectPeriod(today: string, column?: Pick<RoadmapColumn, 'start' | 'end'>) {
  if (column) return { startDate: column.start, endDate: column.end };
  return { startDate: today, endDate: endOfMonth(addMonthsIso(startOfMonth(today), 2)) };
}

/** The sizes of the roadmap for a text size and a density. */
export interface RoadmapMetrics {
  /** One line of text in the bar, and its border. */
  barHeight: number;
  /** Space above and below the bar of a row. */
  rowPadding: number;
  /** Width of the column with the projects, before the phone's limit. */
  labelWidth: number;
}

/** Bigger text makes bars and the projects column bigger; compact mode brings the rows closer. */
export function roadmapMetrics(textScale: number, compact: boolean): RoadmapMetrics {
  const spacing = Math.min(1, textScale);
  return {
    barHeight: Math.round(24 * textScale) + 4,
    rowPadding: Math.round((compact ? 3 : 8) * spacing),
    labelWidth: Math.round(200 * textScale),
  };
}
