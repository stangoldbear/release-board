import { ZOOM_COLUMN_UNIT, rangeColumns } from '../../domain/schedule';
import type { DateRange, ZoomLevel } from '../../domain/schedule';
import {
  ITALIAN_DAYS_SHORT,
  ITALIAN_MONTHS_SHORT,
  addMonthsIso,
  diffDays,
  endOfMonth,
  getItalianHolidayName,
  isWeekend,
  parseISODate,
  startOfMonth,
} from '../../utils/dateUtils';

/** Width of the sticky column with the row names. */
export const LABEL_WIDTH = 96;

/** The sticky cell with the name of a row; it stays in view while the days scroll by. */
export const LABEL_CELL = 'sticky left-0 z-20 shrink-0 border-r border-line-strong p-2';

/** Pixels per day and height of a task bar at each zoom level. */
export const SCALES: Record<ZoomLevel, { dayWidth: number; barHeight: number }> = {
  detail: { dayWidth: 112, barHeight: 46 },
  month: { dayWidth: 56, barHeight: 46 },
  quarter: { dayWidth: 12, barHeight: 28 },
};

export interface Column {
  start: string;
  end: string;
  width: number;
  /** Weekend or holiday shown in red; day columns only. */
  red: boolean;
  holidays: string[];
  isToday: boolean;
  /** All of its days are before today. */
  past: boolean;
  /** Ends on the last day of a month, where the calendar draws a stronger line. */
  monthEnd: boolean;
}

export function buildColumns(
  range: DateRange,
  zoom: ZoomLevel,
  highlightWeekends: boolean,
  today: string,
): Column[] {
  const { dayWidth } = SCALES[zoom];
  return rangeColumns(range, ZOOM_COLUMN_UNIT[zoom]).map(({ start, end }) => {
    const days = diffDays(start, end) + 1;
    const holidays: string[] = [];
    for (let offset = 0; offset < days; offset += 1) {
      const date = parseISODate(start);
      date.setDate(date.getDate() + offset);
      const name = getItalianHolidayName(date);
      if (name) holidays.push(name);
    }
    const weekend = days === 1 && isWeekend(parseISODate(start));
    return {
      start,
      end,
      width: days * dayWidth,
      red: days === 1 && (holidays.length > 0 || (highlightWeekends && weekend)),
      holidays,
      isToday: start <= today && today <= end,
      past: end < today,
      monthEnd: days === 1 && end === endOfMonth(end),
    };
  });
}

/** Background and text of a day column: past days are grey, then holidays red, then today. */
export function columnTone(column: Column): string {
  if (column.past) return 'bg-past text-fg-muted';
  if (column.red) return 'bg-holiday text-holiday-fg';
  if (column.isToday) return 'bg-accent-soft text-link';
  return '';
}

/** The line at the right of a column: stronger where a month ends. */
export function columnEdge(column: Column): string {
  return column.monthEnd ? 'border-r border-line-strong' : 'border-r border-line';
}

export function dayLabel(iso: string): { weekday: string; day: number; month: string } {
  const date = parseISODate(iso);
  return {
    weekday: ITALIAN_DAYS_SHORT[date.getDay()] ?? '',
    day: date.getDate(),
    month: ITALIAN_MONTHS_SHORT[date.getMonth()] ?? '',
  };
}

/** "sab 17 ott". */
export function dayName(iso: string): string {
  const { weekday, day, month } = dayLabel(iso);
  return `${weekday.toLowerCase()} ${day} ${month}`;
}

/** A month of the timeline, cut to its range. */
export interface MonthSpan {
  /** First day of the month, YYYY-MM-01. */
  month: string;
  /** Its days within the range. */
  days: DateRange;
  /** Pixels from the first day of the range. */
  left: number;
  width: number;
}

export function monthSpans(range: DateRange, dayWidth: number): MonthSpan[] {
  const spans: MonthSpan[] = [];
  for (let month = startOfMonth(range.start); month <= range.end; month = addMonthsIso(month, 1)) {
    const first = month < range.start ? range.start : month;
    const last = endOfMonth(month) > range.end ? range.end : endOfMonth(month);
    spans.push({
      month,
      days: { start: first, end: last },
      left: diffDays(range.start, first) * dayWidth,
      width: (diffDays(first, last) + 1) * dayWidth,
    });
  }
  return spans;
}
