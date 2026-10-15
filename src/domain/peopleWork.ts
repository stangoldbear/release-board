import { addDaysIso } from '../utils/dateUtils';
import type { WorkSchedule } from './assignments';
import type { DateRange } from './schedule';

// The work of each person across the projects (0.19, the part «Persone» of the timeline): the
// bars of one person on lines of their own when they share days, and the days on which the
// person has more than one project at a time.

/** What the people view needs of a bar: its id and where its work falls. */
export interface PersonBar {
  id: string;
  schedule: Pick<WorkSchedule, 'start' | 'end' | 'workDays'>;
}

/**
 * The bars of a person on lines: in the order of their start, each on the first line that is free
 * by then, so that two bars never cover each other. `lines` is at least one, for an empty row.
 */
export function stackBars<T extends PersonBar>(
  bars: readonly T[],
): {
  placed: { bar: T; line: number }[];
  lines: number;
} {
  const sorted = [...bars].sort(
    (a, b) =>
      a.schedule.start.localeCompare(b.schedule.start) ||
      a.schedule.end.localeCompare(b.schedule.end) ||
      a.id.localeCompare(b.id),
  );
  const ends: string[] = [];
  const placed = sorted.map((bar) => {
    const free = ends.findIndex((end) => end < bar.schedule.start);
    const line = free === -1 ? ends.length : free;
    ends[line] = bar.schedule.end;
    return { bar, line };
  });
  return { placed, lines: Math.max(1, ends.length) };
}

/** The days on which two bars or more have work, in order. */
export function sharedDays(bars: readonly PersonBar[]): string[] {
  const seen = new Map<string, number>();
  for (const bar of bars) {
    for (const day of new Set(bar.schedule.workDays)) seen.set(day, (seen.get(day) ?? 0) + 1);
  }
  return [...seen]
    .filter(([, count]) => count > 1)
    .map(([day]) => day)
    .sort();
}

/** Days in order as ranges of consecutive days, to draw one band for each. */
export function dayRuns(days: readonly string[]): DateRange[] {
  const runs: DateRange[] = [];
  for (const day of days) {
    const last = runs.at(-1);
    if (last && addDaysIso(last.end, 1) === day) last.end = day;
    else runs.push({ start: day, end: day });
  }
  return runs;
}

/** Whether a bar has work on a day. */
export function worksOn(bar: PersonBar, day: string): boolean {
  return bar.schedule.workDays.includes(day);
}
