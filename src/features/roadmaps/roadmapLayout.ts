import type { DateRange, ZoomLevel } from '../../domain/schedule';
import type { Project } from '../../domain/types';
import { LINE_HEIGHT } from '../../shared/ui/textScale';
import {
  ITALIAN_MONTHS_SHORT,
  addDaysIso,
  addMonthsIso,
  endOfMonth,
  startOfWeek,
} from '../../utils/dateUtils';
import { timelineMetrics } from '../calendar/timelineLayout';

/** Months of room before the first project and after the last one, to move them further. */
const MARGIN_MONTHS = 1;

/**
 * The days the roadmap holds: those of its calendar view, widened to the projects with a month of
 * room on each side, in whole weeks. Every project has its bar, however far it is.
 */
export function roadmapRange(
  view: DateRange,
  projects: readonly Pick<Project, 'startDate' | 'endDate'>[],
): DateRange {
  let { start, end } = view;
  for (const project of projects) {
    const before = addMonthsIso(project.startDate, -MARGIN_MONTHS);
    const after = addMonthsIso(project.endDate, MARGIN_MONTHS);
    if (before < start) start = before;
    if (after > end) end = after;
  }
  return { start: startOfWeek(start), end: addDaysIso(startOfWeek(end), 6) };
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

/** The period of a new project: from the day clicked, or today, to the end of the third month. */
export function newProjectPeriod(from: string): { startDate: string; endDate: string } {
  return { startDate: from, endDate: endOfMonth(addMonthsIso(from, 2)) };
}

/** The sizes of the roadmap for a zoom level, a text size and a density. */
export interface RoadmapMetrics {
  dayWidth: number;
  /** One line of text in the bar of a project, and its border. */
  barHeight: number;
  /** The bar of a person under the project's: one line of text and its border. */
  assignmentHeight: number;
  /** Space above and below the bars of a row. */
  rowPadding: number;
  /** Width of the column with the projects, before the phone's limit. */
  labelWidth: number;
  /** Lines of a description that the column shows. */
  descriptionLines: number;
}

/**
 * The days are as wide as in the calendar at the same zoom; bigger text makes bars and the column
 * of the projects bigger, smaller text brings the rows closer, as compact mode does.
 */
export function roadmapMetrics(
  zoom: ZoomLevel,
  textScale: number,
  compact: boolean,
): RoadmapMetrics {
  const { dayWidth } = timelineMetrics(zoom, textScale, compact);
  const spacing = Math.min(1, textScale);
  const line = 12 * textScale * (compact ? LINE_HEIGHT.compact : LINE_HEIGHT.normal);
  return {
    dayWidth,
    barHeight: Math.round(24 * textScale) + 4,
    assignmentHeight: Math.round(line) + 8,
    rowPadding: Math.round((compact ? 3 : 6) * spacing),
    labelWidth: Math.round(220 * textScale),
    descriptionLines: compact ? 2 : 3,
  };
}
