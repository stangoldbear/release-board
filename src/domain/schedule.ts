import type { TaskItem } from './types';
import {
  addDaysIso,
  addMonthsIso,
  diffDays,
  endOfMonth,
  startOfMonth,
  startOfWeek,
} from '../utils/dateUtils';

/** How much of the calendar is visible at once, from the closest to the widest. */
export type ZoomLevel = 'detail' | 'month' | 'quarter';

export const ZOOM_LEVELS: readonly ZoomLevel[] = ['detail', 'month', 'quarter'];

/** What one column of the calendar stands for at each zoom level. */
export const ZOOM_COLUMN_UNIT: Record<ZoomLevel, 'day' | 'week'> = {
  detail: 'day',
  month: 'day',
  quarter: 'week',
};

/** Consecutive days as YYYY-MM-DD, both ends included. */
export interface DateRange {
  start: string;
  end: string;
}

/** The dates of a task, the only part of it that scheduling looks at. */
type Dated = Pick<TaskItem, 'startDate' | 'endDate'>;

/**
 * The days shown at a zoom level for an anchor date: the two weeks from the Monday of its week,
 * its month, or its month and the next two widened to whole weeks.
 */
export function visibleRange(zoom: ZoomLevel, anchor: string): DateRange {
  switch (zoom) {
    case 'detail': {
      const start = startOfWeek(anchor);
      return { start, end: addDaysIso(start, 13) };
    }
    case 'month':
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    case 'quarter': {
      const lastMonthEnd = endOfMonth(addMonthsIso(anchor, 2));
      return {
        start: startOfWeek(startOfMonth(anchor)),
        end: addDaysIso(startOfWeek(lastMonthEnd), 6),
      };
    }
  }
}

/** The anchor one page earlier (step -1) or later (step 1): two weeks, one month or three months. */
export function shiftAnchor(zoom: ZoomLevel, anchor: string, step: number): string {
  switch (zoom) {
    case 'detail':
      return addDaysIso(anchor, 14 * step);
    case 'month':
      return addMonthsIso(anchor, step);
    case 'quarter':
      return addMonthsIso(anchor, 3 * step);
  }
}

/** Monday to Sunday of the week that contains the date. */
export function weekRange(date: string): DateRange {
  const start = startOfWeek(date);
  return { start, end: addDaysIso(start, 6) };
}

export function rangeLength(range: DateRange): number {
  return diffDays(range.start, range.end) + 1;
}

export function rangeDays(range: DateRange): string[] {
  return Array.from({ length: rangeLength(range) }, (_, index) => addDaysIso(range.start, index));
}

export function isInRange(date: string, range: DateRange): boolean {
  return range.start <= date && date <= range.end;
}

/** The range cut into columns of one day or of seven days. */
export function rangeColumns(range: DateRange, unit: 'day' | 'week'): DateRange[] {
  const size = unit === 'day' ? 1 : 7;
  const columns: DateRange[] = [];
  for (let start = range.start; start <= range.end; start = addDaysIso(start, size)) {
    const end = addDaysIso(start, size - 1);
    columns.push({ start, end: end < range.end ? end : range.end });
  }
  return columns;
}

export function overlapsRange(task: Dated, range: DateRange): boolean {
  return task.startDate <= range.end && task.endDate >= range.start;
}

export function tasksOnDay<T extends Dated>(tasks: readonly T[], date: string): T[] {
  return tasks.filter((task) => task.startDate <= date && date <= task.endDate);
}

export interface PlacedTask<T extends Dated> {
  task: T;
  /** Offsets in days from the start of the range, cut to the range. */
  first: number;
  last: number;
  /** Row inside the lane: overlapping tasks go on different rows. */
  track: number;
  /** The task goes on before or after the visible range. */
  continuesBefore: boolean;
  continuesAfter: boolean;
}

/**
 * Places the tasks that fall in the range on as few rows as possible: each task takes the first
 * row that is free on all of its days.
 */
export function placeTasks<T extends Dated>(
  tasks: readonly T[],
  range: DateRange,
): { placed: PlacedTask<T>[]; tracks: number } {
  const lastOffset = rangeLength(range) - 1;
  const lastDayOfTrack: number[] = [];

  const placed = tasks
    .filter((task) => overlapsRange(task, range))
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate))
    .map((task) => {
      const first = Math.max(0, diffDays(range.start, task.startDate));
      const last = Math.min(lastOffset, diffDays(range.start, task.endDate));
      let track = lastDayOfTrack.findIndex((lastDay) => lastDay < first);
      if (track === -1) track = lastDayOfTrack.length;
      lastDayOfTrack[track] = last;
      return {
        task,
        first,
        last,
        track,
        continuesBefore: task.startDate < range.start,
        continuesAfter: task.endDate > range.end,
      };
    });

  return { placed, tracks: lastDayOfTrack.length };
}

/** The task moved by some days, keeping its length. */
export function moveTask<T extends Dated>(task: T, days: number): T {
  return {
    ...task,
    startDate: addDaysIso(task.startDate, days),
    endDate: addDaysIso(task.endDate, days),
  };
}

/** The task moved so that it starts on the date, keeping its length. */
export function moveTaskTo<T extends Dated>(task: T, startDate: string): T {
  return moveTask(task, diffDays(task.startDate, startDate));
}

/** One end of the task moved by some days; it never goes past the other end. */
export function resizeTask<T extends Dated>(task: T, edge: 'start' | 'end', days: number): T {
  if (edge === 'start') {
    const startDate = addDaysIso(task.startDate, days);
    return { ...task, startDate: startDate < task.endDate ? startDate : task.endDate };
  }
  const endDate = addDaysIso(task.endDate, days);
  return { ...task, endDate: endDate > task.startDate ? endDate : task.startDate };
}
