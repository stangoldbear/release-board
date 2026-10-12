import { addDaysIso, isIsoDate } from '../utils/dateUtils';
import { isKnownColorId } from './colors';
import type { TaskColorId } from './colors';
import type { SeenReminders } from './memos';
import type { Milestone } from './types';

// A note on a day of the roadmap: a diamond on the row of its project, or on the row of the notes
// at the top when it belongs to no project; with a color, a text, and an alert on its day.

/** Longest title and text of a note; the security rules enforce the same. */
export const MILESTONE_TITLE_MAX = 200;
export const MILESTONE_BODY_MAX = 2000;
export const DEFAULT_MILESTONE_COLOR_ID: TaskColorId = 'yellow';

/** What a new note holds. */
export type MilestoneContent = Omit<Milestone, 'id'>;

/** Fields of a note to change; null removes an optional one. */
export interface MilestoneChanges {
  date?: string;
  title?: string;
  body?: string | null;
  colorId?: TaskColorId;
  projectId?: string | null;
  remind?: true | null;
}

/** The notes by day, then by title and id, so that every copy agrees. */
export function sortMilestones(milestones: readonly Milestone[]): Milestone[] {
  return [...milestones].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
  );
}

export function milestonesOfProject(
  milestones: readonly Milestone[],
  projectId: string,
): Milestone[] {
  return sortMilestones(milestones.filter((item) => item.projectId === projectId));
}

/** The notes of no project: the row at the top of the roadmap. */
export function freeMilestones(milestones: readonly Milestone[]): Milestone[] {
  return sortMilestones(milestones.filter((item) => item.projectId === undefined));
}

/** The fields that differ between a note and what the editor saves; blanks remove the optional ones. */
export function diffMilestone(before: Milestone, after: MilestoneContent): MilestoneChanges {
  const changes: MilestoneChanges = {};
  const title = after.title.trim();
  if (title !== before.title) changes.title = title;
  if (after.date !== before.date) changes.date = after.date;
  const body = after.body?.trim() || undefined;
  if (body !== before.body) changes.body = body ?? null;
  if (after.colorId !== before.colorId) changes.colorId = after.colorId;
  if (after.projectId !== before.projectId) changes.projectId = after.projectId ?? null;
  if ((after.remind ?? null) !== (before.remind ?? null)) changes.remind = after.remind ?? null;
  return changes;
}

type Data = Record<string, unknown>;

function isData(value: unknown): value is Data {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A note from its data, as a backup or a document holds it; null when it is not one. An unknown
 * color takes the default: the note is worth more than its color.
 */
export function parseMilestone(id: string, value: unknown): Milestone | null {
  if (!isData(value)) return null;
  const { date, title, body, colorId, projectId, remind } = value;
  if (!isIsoDate(date)) return null;
  if (typeof title !== 'string' || title.trim() === '' || title.length > MILESTONE_TITLE_MAX) {
    return null;
  }
  const milestone: Milestone = {
    id,
    date,
    title,
    colorId:
      typeof colorId === 'string' && isKnownColorId(colorId) ? colorId : DEFAULT_MILESTONE_COLOR_ID,
  };
  if (body !== undefined) {
    if (typeof body !== 'string' || body.length > MILESTONE_BODY_MAX) return null;
    if (body.trim()) milestone.body = body;
  }
  if (projectId !== undefined) {
    if (typeof projectId !== 'string' || projectId.trim() === '' || projectId.length > 100) {
      return null;
    }
    milestone.projectId = projectId;
  }
  if (remind !== undefined) {
    if (remind !== true) return null;
    milestone.remind = true;
  }
  return milestone;
}

/** The note moved by some days: any day, a note can mark a weekend. */
export function moveMilestone<T extends Pick<Milestone, 'date'>>(milestone: T, days: number): T {
  return days === 0 ? milestone : { ...milestone, date: addDaysIso(milestone.date, days) };
}

/** The notes whose day has come and that asked for an alert, not dismissed yet for that day. */
export function dueMilestones(
  milestones: readonly Milestone[],
  today: string,
  seen: SeenReminders,
): Milestone[] {
  return sortMilestones(milestones).filter(
    (item) => item.remind === true && item.date <= today && seen[item.id] !== item.date,
  );
}

/** The alerts dismissed, by note and day; those of notes gone are forgotten. */
export function rememberMilestoneReminders(
  seen: SeenReminders,
  shown: readonly Milestone[],
  existing: readonly Milestone[],
): SeenReminders {
  const ids = new Set(existing.map((item) => item.id));
  const kept: Record<string, string> = Object.fromEntries(
    Object.entries(seen).filter(([id]) => ids.has(id)),
  );
  for (const item of shown) kept[item.id] = item.date;
  return kept;
}
