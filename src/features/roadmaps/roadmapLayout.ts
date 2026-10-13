import type { DateRange } from '../../domain/schedule';
import { LINE_HEIGHT } from '../../shared/ui/textScale';
import { ITALIAN_MONTHS_SHORT, addDaysIso, addMonthsIso, startOfWeek } from '../../utils/dateUtils';

/** Months of room before the first project and after the last one, to move them further. */
const MARGIN_MONTHS = 1;

/**
 * The days the roadmap holds: those of its calendar view, widened to the projects with a month of
 * room on each side, in whole weeks. Every project has its bar, however far it is.
 */
export function roadmapRange(
  view: DateRange,
  projects: readonly { startDate: string; endDate: string }[],
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
export function projectPeriod(project: { startDate: string; endDate: string }): string {
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

/** The sizes of the roadmap for a zoom level, a text size and a density. */
export interface RoadmapMetrics {
  dayWidth: number;
  /** One line of text in the bar of a project, and its border. */
  barHeight: number;
  /** The same line with less room around the text, for the titles alone. */
  tightBarHeight: number;
  /** One line of text and room around it: the rows of the notes on the timeline and of a group. */
  assignmentHeight: number;
  /** The row of a person under the project's, at the Team level: one line of text, no more. */
  personRowHeight: number;
  /** The bar of the work of a person in that row, almost as tall: the bars of a team nearly touch. */
  workBarHeight: number;
  /** A lane of the work inside the bar of a project with the name of its person: a line of text. */
  laneHeight: number;
  /** Space above and below the bars of a row. */
  rowPadding: number;
  /** One line of the text of the column, for the height of the rows. */
  lineHeight: number;
  /** The padding of a cell of the column, as LABEL_CELL draws it: less in compact mode. */
  cellPadding: number;
}

/**
 * The days are as wide as the view sets them, as in the calendar; bigger text makes the bars
 * taller, smaller text brings the rows closer, as compact mode does. The column of the names is
 * the timeline's, which the user sizes.
 */
export function roadmapMetrics(
  dayWidth: number,
  textScale: number,
  compact: boolean,
): RoadmapMetrics {
  const spacing = Math.min(1, textScale);
  const line = 12 * textScale * (compact ? LINE_HEIGHT.compact : LINE_HEIGHT.normal);
  return {
    dayWidth,
    barHeight: Math.round(24 * textScale) + 4,
    tightBarHeight: Math.round(20 * textScale) + 4,
    assignmentHeight: Math.round(line) + 8,
    personRowHeight: Math.round(line),
    workBarHeight: Math.round(line) - 2,
    laneHeight: Math.round(12 * textScale) + (compact ? 2 : 4),
    rowPadding: Math.round((compact ? 3 : 6) * spacing),
    lineHeight: Math.round(line),
    cellPadding: compact ? 4 : 8,
  };
}
