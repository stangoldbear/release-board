import type { CSSProperties } from 'react';
import { rangeColumns } from '../../domain/schedule';
import { LINE_HEIGHT } from '../../shared/ui/textScale';
import type { DateRange } from '../../domain/schedule';
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

/**
 * The sticky cell with the name of a row; it stays in view while the days scroll by. Its width is
 * --gantt-label-width, which the timeline sets for the size of its text.
 */
export const LABEL_CELL =
  'sticky left-0 z-[700] w-(--gantt-label-width) shrink-0 border-r border-line-strong p-2 in-data-compact:px-1.5 in-data-compact:py-1';

/** Finds the first name cell of a timeline, to measure the width the days have beside it. */
export const LABEL_CELL_SELECTOR = '.sticky.left-0';

/**
 * The scrolling part of a timeline: its own stacking context, so that the bars (by closeness to
 * today, then the one under the pointer, the result in view and the dragged one) and the sticky
 * names stack among themselves, under the page's header.
 */
export const TIMELINE_SCROLLER =
  'relative isolate w-full touch-pan-x touch-pan-y overflow-x-auto [overflow-anchor:none]';

/** Height of a task bar with text of the normal size: two lines over days, one over weeks. */
const BAR_HEIGHT = { day: 46, week: 28 };

/** Days narrower than this are gathered in columns of a week, as in the quarter view. */
export const MIN_DAY_COLUMN_WIDTH = 20;

/** Day columns narrower than this show the initial of the weekday and an icon for a note. */
export const NARROW_DAY_WIDTH = 40;

/** What one column stands for at a width per day: a day, or a week when a day would be too narrow. */
export function columnUnit(dayWidth: number): 'day' | 'week' {
  return dayWidth < MIN_DAY_COLUMN_WIDTH ? 'week' : 'day';
}

/** Width of the column with the row names, with text of the normal size. */
const LABEL_WIDTH = 96;

/** Most of the calendar's text, in pixels at the normal size (text-xs). */
const TEXT_SIZE = 12;

/** The border of a bar takes 2 pixels at the top and 2 at the bottom, at every text size. */
const BAR_BORDER = 4;

/** Around the one line of a note: the paddings of its day and of its chip, and the chip's border. */
const NOTE_CHROME = 18;

/**
 * The order in which bars that start closer to today are drawn over the others, when their titles
 * run out of them: 400 for a bar that starts today, down to 10 a year or more away.
 */
export function stackingOrder(today: string, start: string): number {
  return Math.max(10, 400 - Math.abs(diffDays(today, start)));
}

/** The sizes of the timeline for a zoom level, a text size and a density. */
export interface TimelineMetrics {
  dayWidth: number;
  barHeight: number;
  /** Space between two rows of bars in a lane, and above and below them. */
  trackGap: number;
  lanePadding: number;
  /** Width of the sticky column with the row names. */
  labelWidth: number;
  /** Lines of text that fit in a task bar. */
  barLines: number;
  /** Least height of a day of the notes row, and the lines of a note it shows. */
  noteHeight: number;
  noteLines: number;
  /** Least height of a week of the notes row, in the quarter view. */
  weekNoteHeight: number;
  /** Rough width of one character of the daily values, to shorten the numbers that do not fit. */
  digitWidth: number;
}

/**
 * Bigger text makes the bars, the names column and the notes taller or wider with it, not the
 * days, whose width the view sets; smaller text also brings the bars closer. Compact mode tightens
 * lines and spacing, so that every box shows more of its text. With the titles on one line, bars
 * and notes are one line tall at every width, as over columns of weeks.
 */
export function timelineMetrics(
  dayWidth: number,
  textScale: number,
  compact: boolean,
  oneLineTitles = false,
): TimelineMetrics {
  const normalBarHeight = oneLineTitles ? BAR_HEIGHT.week : BAR_HEIGHT[columnUnit(dayWidth)];
  // The room inside the border grows and shrinks with the text, so the same lines always fit.
  const barHeight = Math.round((normalBarHeight - BAR_BORDER) * textScale) + BAR_BORDER;
  const line = TEXT_SIZE * textScale * (compact ? LINE_HEIGHT.compact : LINE_HEIGHT.normal);
  const spacing = Math.min(1, textScale);
  return {
    dayWidth,
    barHeight,
    trackGap: Math.round((compact ? 3 : 6) * spacing),
    lanePadding: Math.round((compact ? 3 : 8) * spacing),
    labelWidth: Math.round(LABEL_WIDTH * textScale),
    barLines: oneLineTitles ? 1 : Math.max(1, Math.floor((barHeight - BAR_BORDER) / line)),
    noteHeight: oneLineTitles ? Math.round(line) + NOTE_CHROME : Math.round(64 * textScale),
    noteLines: oneLineTitles ? 1 : compact ? 4 : 3,
    weekNoteHeight: Math.round(56 * textScale),
    digitWidth: 7 * textScale,
  };
}

/** The lines of text that a style clamps to, with an ellipsis on the last one. */
export function clampLines(lines: number): CSSProperties {
  return {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: lines,
    overflow: 'hidden',
  };
}

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
  dayWidth: number,
  highlightWeekends: boolean,
  today: string,
): Column[] {
  return rangeColumns(range, columnUnit(dayWidth)).map(({ start, end }) => {
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
