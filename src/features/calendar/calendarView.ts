import { ZOOM_LEVELS, weekRange } from '../../domain/schedule';
import type { DateRange, ZoomLevel } from '../../domain/schedule';
import {
  ITALIAN_MONTHS,
  ITALIAN_MONTHS_SHORT,
  addDaysIso,
  addMonthsIso,
  diffDays,
  endOfMonth,
  startOfMonth,
  startOfWeek,
} from '../../utils/dateUtils';

/** The timeline with lanes, or the board of one week. */
export type CalendarMode = 'timeline' | 'week';

/** A day to bring to the left edge of the timeline. Every navigation has a new id, even to the same day. */
export interface CalendarJump {
  date: string;
  id: number;
}

export interface CalendarView {
  mode: CalendarMode;
  /** Zoom of the timeline; the week board ignores it. */
  zoom: ZoomLevel;
  /** The timeline: the first day in view, as reported while scrolling. The board: a day of its week. */
  anchor: string;
  /** The last navigation, which the timeline scrolls to. */
  jump: CalendarJump;
  /** The days the timeline holds, from a Monday to a Sunday. It grows, and never shrinks. */
  range: DateRange;
}

export type CalendarAction =
  | { type: 'previous' }
  | { type: 'next' }
  /** Brings a day into view, at a new zoom level when one is given. */
  | { type: 'goTo'; date: string; zoom?: ZoomLevel }
  | { type: 'setMode'; mode: CalendarMode }
  | { type: 'setZoom'; zoom: ZoomLevel }
  /** -1 zooms in, towards fewer days; 1 zooms out. Stops at the first and last level. */
  | { type: 'zoomBy'; step: -1 | 1 }
  /**
   * The timeline reports the first and last day in view. `settled` once scrolling has stopped:
   * only then may the timeline grow at its start, which moves everything after it.
   */
  | { type: 'scrolled'; first: string; last: string; settled: boolean };

/** Months before and after today that the timeline holds when it opens. */
const MONTHS_BEFORE = 3;
const MONTHS_AFTER = 6;
/** When the days in view come this close to either end, the timeline grows by GROW_MONTHS. */
const EDGE_DAYS = 45;
const GROW_MONTHS = 3;

/** Whole weeks from the one with the first day of `first`'s month to the one with the last of `last`'s. */
function monthsRange(first: string, last: string): DateRange {
  return {
    start: startOfWeek(startOfMonth(first)),
    end: addDaysIso(startOfWeek(endOfMonth(last)), 6),
  };
}

/** The days the timeline holds when it opens: some months of past and more of future. */
export function initialRange(today: string): DateRange {
  return monthsRange(addMonthsIso(today, -MONTHS_BEFORE), addMonthsIso(today, MONTHS_AFTER));
}

/** True when the last day in view is close enough to the end of the timeline that it should grow. */
export function isNearEnd(range: DateRange, last: string): boolean {
  return diffDays(last, range.end) < EDGE_DAYS;
}

/** The range grown so that `date` can be at the left edge, with months of days after it. */
function rangeAround(range: DateRange, date: string): DateRange {
  const wanted = monthsRange(date, addMonthsIso(date, MONTHS_AFTER));
  return {
    start: wanted.start < range.start ? wanted.start : range.start,
    end: wanted.end > range.end ? wanted.end : range.end,
  };
}

function goTo(view: CalendarView, date: string): CalendarView {
  return {
    ...view,
    anchor: date,
    jump: { date, id: view.jump.id + 1 },
    range: rangeAround(view.range, date),
  };
}

/** The range grown at the ends that the days in view have come close to. */
function grownRange(view: CalendarView, first: string, last: string, settled: boolean): DateRange {
  const { range } = view;
  const start =
    settled && diffDays(range.start, first) < EDGE_DAYS
      ? monthsRange(addMonthsIso(range.start, -GROW_MONTHS), range.start).start
      : range.start;
  const end = isNearEnd(range, last)
    ? monthsRange(range.end, addMonthsIso(range.end, GROW_MONTHS)).end
    : range.end;
  return start === range.start && end === range.end ? range : { start, end };
}

export function calendarViewReducer(view: CalendarView, action: CalendarAction): CalendarView {
  switch (action.type) {
    case 'previous':
    case 'next': {
      const step = action.type === 'next' ? 1 : -1;
      if (view.mode === 'week') return { ...view, anchor: addDaysIso(view.anchor, 7 * step) };
      return goTo(view, addMonthsIso(startOfMonth(view.anchor), step));
    }
    case 'goTo': {
      const moved = goTo(view, action.date);
      return action.zoom ? { ...moved, mode: 'timeline', zoom: action.zoom } : moved;
    }
    case 'setMode':
      if (action.mode === view.mode) return view;
      // Back on the timeline, it opens on the week the board was showing.
      return action.mode === 'timeline'
        ? { ...goTo(view, view.anchor), mode: 'timeline' }
        : { ...view, mode: 'week' };
    case 'setZoom': {
      const timeline =
        view.mode === 'week'
          ? calendarViewReducer(view, { type: 'setMode', mode: 'timeline' })
          : view;
      return timeline.zoom === action.zoom ? timeline : { ...timeline, zoom: action.zoom };
    }
    case 'zoomBy': {
      const index = ZOOM_LEVELS.indexOf(view.zoom) + action.step;
      const zoom = ZOOM_LEVELS[Math.min(Math.max(index, 0), ZOOM_LEVELS.length - 1)];
      return zoom === undefined || zoom === view.zoom ? view : { ...view, zoom };
    }
    case 'scrolled': {
      const range = grownRange(view, action.first, action.last, action.settled);
      return action.first === view.anchor && range === view.range
        ? view
        : { ...view, anchor: action.first, range };
    }
  }
}

/** The view when the app opens: the timeline, with today at its left edge. */
export function initialView(zoom: ZoomLevel, today: string): CalendarView {
  return {
    mode: 'timeline',
    zoom,
    anchor: today,
    jump: { date: today, id: 0 },
    range: initialRange(today),
  };
}

function parts(iso: string) {
  const [year = '', month = '', day = ''] = iso.split('-');
  return { year, month: Number(month) - 1, day: Number(day) };
}

/** "28 set – 11 ott 2026", with the year only once when both dates share it. */
function dayRangeLabel(range: DateRange): string {
  const start = parts(range.start);
  const end = parts(range.end);
  const startText = `${start.day} ${ITALIAN_MONTHS_SHORT[start.month]}`;
  const endText = `${end.day} ${ITALIAN_MONTHS_SHORT[end.month]} ${end.year}`;
  return start.year === end.year
    ? `${startText} – ${endText}`
    : `${startText} ${start.year} – ${endText}`;
}

/** "Ottobre 2026". */
export function monthLabel(iso: string): string {
  const { year, month } = parts(iso);
  return `${ITALIAN_MONTHS[month]} ${year}`;
}

/** What the header shows: the month at the left edge of the timeline, or the week of the board. */
export function periodLabel(view: CalendarView): string {
  return view.mode === 'week' ? dayRangeLabel(weekRange(view.anchor)) : monthLabel(view.anchor);
}
