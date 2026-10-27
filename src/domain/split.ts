import { addDaysIso } from '../utils/dateUtils';
import { isAbsentOn, isWorkingDay, scheduleAssignment } from './assignments';
import type { WorkSchedule } from './assignments';
import type { DateRange } from './schedule';
import type { Absence } from './types';

// Splitting a bar in parts (0.21): the work of a person or a block of contingency, in days of work
// with their halves, or a task of Next Releases, in days of the calendar. The parts follow one
// another, with a pause between them if asked, and together they make the whole bar.

/** Parts at most, whatever the bar: more would be easier to add one at a time. */
export const SPLIT_PARTS_MAX = 10;
/** Days of pause between two parts at most. */
export const SPLIT_GAP_MAX = 60;

/** The smallest part: half a day of work, or a whole day of a task. */
export type SplitStep = 0.5 | 1;

/** How many parts a bar can make: each at least a step, and no more than `limit`. */
export function maxSplitParts(total: number, step: SplitStep, limit = SPLIT_PARTS_MAX): number {
  return Math.max(0, Math.min(limit, Math.floor(total / step + 1e-9)));
}

/**
 * Parts as equal as they can be. Days of work are split in whole days when there are enough, the
 * first parts taking one more when they do not divide, and a half day left goes to the last part:
 * a part that ends at half a day leaves the rest of that day empty, since the next starts on the
 * following one.
 */
export function equalParts(total: number, parts: number, step: SplitStep): number[] {
  const whole = Math.floor(total + 1e-9);
  const unit = step === 0.5 && whole >= parts ? 1 : step;
  const rest = step === 0.5 && unit === 1 ? total - whole : 0;
  const units = Math.round((total - rest) / unit);
  const base = Math.floor(units / parts);
  const extra = units % parts;
  return Array.from({ length: parts }, (_, index) => {
    const size = (base + (index < extra ? 1 : 0)) * unit;
    return index === parts - 1 ? size + rest : size;
  });
}

/**
 * The parts after moving the cut that follows part `index` by `steps`: one part grows, the next
 * shrinks, and none goes below a step.
 */
export function moveCut(
  sizes: readonly number[],
  index: number,
  steps: number,
  step: SplitStep,
): number[] {
  const before = sizes[index];
  const after = sizes[index + 1];
  if (before === undefined || after === undefined) return [...sizes];
  const delta = Math.min(Math.max(steps * step, step - before), after - step);
  return sizes.map((size, at) =>
    at === index ? before + delta : at === index + 1 ? after - delta : size,
  );
}

/**
 * The parts after giving part `index` a size: the next part, or the one before for the last,
 * takes what changes, so that the whole stays the same. The size is rounded to the step and kept
 * so that both parts have one at least.
 */
export function resizePart(
  sizes: readonly number[],
  index: number,
  size: number,
  step: SplitStep,
): number[] {
  const current = sizes[index];
  if (current === undefined || !Number.isFinite(size) || sizes.length < 2) return [...sizes];
  const rounded = Math.round(size / step) * step;
  return index < sizes.length - 1
    ? moveCut(sizes, index, (rounded - current) / step, step)
    : moveCut(sizes, index - 1, (current - rounded) / step, step);
}

/**
 * The day after `day` on which a person works again after `pause` more working days, skipping
 * weekends, holidays, closures and absences; null past a year.
 */
function nextWorkingDay(
  day: string,
  pause: number,
  absences: readonly Absence[],
  closures: readonly DateRange[],
): string | null {
  let skipped = 0;
  let current = addDaysIso(day, 1);
  for (let steps = 0; steps < 366 + pause * 7; steps += 1, current = addDaysIso(current, 1)) {
    if (!isWorkingDay(current, closures) || isAbsentOn(absences, current)) continue;
    if (skipped === pause) return current;
    skipped += 1;
  }
  return null;
}

/** A part of work: where it is set to start, its days, and how they fall on the calendar. */
export interface WorkPart {
  startDate: string;
  manDays: number;
  schedule: WorkSchedule;
}

/**
 * The parts of a piece of work, one after the other on the working days of the person, with
 * `pause` working days between two parts. The first keeps the start of the work. Null when a part
 * does not fit in the calendar.
 */
export function splitWork(
  work: { startDate: string; manDays: number },
  sizes: readonly number[],
  pause: number,
  absences: readonly Absence[],
  closures: readonly DateRange[],
): WorkPart[] | null {
  const parts: WorkPart[] = [];
  let start: string | null = work.startDate;
  for (const manDays of sizes) {
    if (start === null) return null;
    const schedule = scheduleAssignment({ startDate: start, manDays }, absences, closures);
    if (schedule.truncated) return null;
    parts.push({ startDate: start, manDays, schedule });
    start = nextWorkingDay(schedule.end, pause, absences, closures);
  }
  return parts;
}

/**
 * The parts of a task of `days` calendar days from `startDate`, one after the other, with `pause`
 * days between two parts, as the first and the last day of each.
 */
export function splitDays(startDate: string, sizes: readonly number[], pause: number): DateRange[] {
  const parts: DateRange[] = [];
  let start = startDate;
  for (const days of sizes) {
    const end = addDaysIso(start, days - 1);
    parts.push({ start, end });
    start = addDaysIso(end, pause + 1);
  }
  return parts;
}
