import {
  addDaysIso,
  getItalianHolidayName,
  isIsoDate,
  isWeekend,
  parseISODate,
} from '../utils/dateUtils';
import { formatLocaleNumber } from './numberFormat';
import type { DateRange } from './schedule';
import type { Absence, Assignment } from './types';

/** Longest note of an assignment and the bounds of its effort; the security rules enforce the same. */
export const ASSIGNMENT_NOTE_MAX = 500;
export const MAN_DAYS_MAX = 500;
/** Working days in a week: an effort can be given in weeks. */
export const DAYS_PER_WEEK = 5;
/** How far the work may stretch, in calendar days, before the bar is cut: absences could be endless. */
const MAX_SPAN_DAYS = 2000;

/** What a new assignment holds. */
export type AssignmentContent = Omit<Assignment, 'id'>;

/** Fields of an assignment to change; null removes the note. */
export interface AssignmentChanges {
  stakeholderId?: string;
  startDate?: string;
  manDays?: number;
  note?: string | null;
}

/** The assignments by start, then by id, so that every copy agrees. */
export function sortAssignments(assignments: readonly Assignment[]): Assignment[] {
  return [...assignments].sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id),
  );
}

export function assignmentsOfProject(
  assignments: readonly Assignment[],
  projectId: string,
): Assignment[] {
  return sortAssignments(assignments.filter((item) => item.projectId === projectId));
}

/** The fields that differ between an assignment and what the editor saves; a blank note removes it. */
export function diffAssignment(before: Assignment, after: AssignmentContent): AssignmentChanges {
  const changes: AssignmentChanges = {};
  if (after.stakeholderId !== before.stakeholderId) changes.stakeholderId = after.stakeholderId;
  if (after.startDate !== before.startDate) changes.startDate = after.startDate;
  if (after.manDays !== before.manDays) changes.manDays = after.manDays;
  const note = after.note?.trim() || undefined;
  if (note !== before.note) changes.note = note ?? null;
  return changes;
}

/** A valid effort: more than nothing, in half days, within the limit. */
export function isValidManDays(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAN_DAYS_MAX &&
    Number.isInteger(value * 2)
  );
}

/** A day on which one works: not a weekend, not an Italian holiday. */
export function isWorkingDay(iso: string): boolean {
  const date = parseISODate(iso);
  return !isWeekend(date) && getItalianHolidayName(date) === null;
}

export function isAbsentOn(absences: readonly Absence[], iso: string): boolean {
  return absences.some((absence) => absence.start <= iso && iso <= absence.end);
}

/** How the work of an assignment falls on the calendar. */
export interface WorkSchedule {
  /** The first working day from the start, and the day the work ends: the span of the bar. */
  start: string;
  end: string;
  /** The days worked, as many as the effort needs, half days rounded up. */
  workDays: string[];
  /** The days away within the span, as ranges, to draw hatched. */
  absences: DateRange[];
  /** The effort did not fit within the limit of calendar days: the bar is cut. */
  truncated: boolean;
}

/**
 * Places the effort of an assignment on the working days from its start, skipping weekends,
 * holidays and the days the stakeholder is away. "Server #1" working three weeks from the 15th of
 * December, away from the 20th of December to the 20th of January, works until the 19th, then
 * from the 21st of January for the days that are left.
 */
export function scheduleAssignment(
  assignment: Pick<Assignment, 'startDate' | 'manDays'>,
  absences: readonly Absence[],
): WorkSchedule {
  const needed = Math.max(1, Math.ceil(assignment.manDays));
  const workDays: string[] = [];
  let day = assignment.startDate;
  for (
    let steps = 0;
    workDays.length < needed && steps < MAX_SPAN_DAYS;
    steps += 1, day = addDaysIso(day, 1)
  ) {
    if (isWorkingDay(day) && !isAbsentOn(absences, day)) workDays.push(day);
  }
  const start = workDays[0] ?? assignment.startDate;
  const end = workDays.at(-1) ?? assignment.startDate;
  return {
    start,
    end,
    workDays,
    absences: absencesWithin(absences, { start, end }),
    truncated: workDays.length < needed,
  };
}

/** The absences that fall in the range, cut to it and merged where they touch or overlap. */
export function absencesWithin(absences: readonly Absence[], range: DateRange): DateRange[] {
  const clipped = absences
    .filter((absence) => absence.start <= range.end && absence.end >= range.start)
    .map((absence) => ({
      start: absence.start > range.start ? absence.start : range.start,
      end: absence.end < range.end ? absence.end : range.end,
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
  const merged: DateRange[] = [];
  for (const piece of clipped) {
    const last = merged.at(-1);
    if (last && piece.start <= addDaysIso(last.end, 1)) {
      if (piece.end > last.end) last.end = piece.end;
    } else {
      merged.push({ ...piece });
    }
  }
  return merged;
}

/**
 * The assignment moved by some days. It lands on a working day: forward when moving ahead,
 * backward when moving back, so that a step from the keyboard always shows.
 */
export function moveAssignment<T extends Pick<Assignment, 'startDate'>>(
  assignment: T,
  days: number,
): T {
  if (days === 0) return assignment;
  let startDate = addDaysIso(assignment.startDate, days);
  const step = days > 0 ? 1 : -1;
  for (let guard = 0; !isWorkingDay(startDate) && guard < 14; guard += 1) {
    startDate = addDaysIso(startDate, step);
  }
  return { ...assignment, startDate };
}

/** "15 giorni (3 settimane)", "1 giorno", "2,5 giorni": the effort in words. */
export function describeEffort(manDays: number): string {
  const days = `${formatLocaleNumber(manDays, Number.isInteger(manDays) ? 0 : 1)} ${
    manDays === 1 ? 'giorno' : 'giorni'
  }`;
  if (manDays >= DAYS_PER_WEEK && manDays % DAYS_PER_WEEK === 0) {
    const weeks = manDays / DAYS_PER_WEEK;
    return `${days} (${weeks} ${weeks === 1 ? 'settimana' : 'settimane'})`;
  }
  return days;
}

type Data = Record<string, unknown>;

function isData(value: unknown): value is Data {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An assignment from its data, as a backup or a document holds it; null when it is not one. */
export function parseAssignment(id: string, value: unknown): Assignment | null {
  if (!isData(value)) return null;
  const { projectId, stakeholderId, startDate, manDays } = value;
  if (typeof projectId !== 'string' || projectId.trim() === '') return null;
  if (typeof stakeholderId !== 'string' || stakeholderId.trim() === '') return null;
  if (!isIsoDate(startDate) || !isValidManDays(manDays)) return null;
  const assignment: Assignment = { id, projectId, stakeholderId, startDate, manDays };
  if (value.note !== undefined) {
    if (typeof value.note !== 'string' || value.note.length > ASSIGNMENT_NOTE_MAX) return null;
    if (value.note.trim()) assignment.note = value.note;
  }
  return assignment;
}
