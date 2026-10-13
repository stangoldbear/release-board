import { addDaysIso } from '../utils/dateUtils';
import type { Project, ProjectStatus } from './types';

// The state of a project as the day of today has it: a planned project whose days have come is in
// progress, one whose days have gone by is completed. The state stored changes only when a member
// confirms it: the roadmap shows the state of the day and the alert that asks to confirm it.

/** The change the day asks for: from the state stored to the one the dates give. */
export interface StatusChange {
  from: ProjectStatus;
  to: ProjectStatus;
  /** The first day the change holds: the start of the project, or the day after its end. */
  since: string;
}

/**
 * The state of a project on a day, from the one stored and its days: a planned project is in
 * progress from its start to its end, both included, and completed after it, as is one in progress.
 * Ideas, projects on hold and completed ones keep the state a member gave them.
 */
export function statusFromDates(
  status: ProjectStatus,
  start: string,
  end: string,
  today: string,
): ProjectStatus {
  if (status === 'planned' && today >= start && today <= end) return 'in_progress';
  if ((status === 'planned' || status === 'in_progress') && today > end) return 'completed';
  return status;
}

/** The change the day asks for, or null when the state stored is the state of the day. */
export function statusChangeOf(
  project: Pick<Project, 'status' | 'startDate'>,
  end: string,
  today: string,
): StatusChange | null {
  const to = statusFromDates(project.status, project.startDate, end, today);
  if (to === project.status) return null;
  return {
    from: project.status,
    to,
    since: to === 'completed' ? addDaysIso(end, 1) : project.startDate,
  };
}

/** A project with the state of the day, and the change to confirm when it differs from the stored one. */
export type ProjectOfDay<T> = T & { statusChange?: StatusChange };

/** The project as the day has it: its state follows the dates, with the change to confirm, if any. */
export function withEffectiveStatus<
  T extends Pick<Project, 'status' | 'startDate'> & { endDate: string },
>(project: T, today: string): ProjectOfDay<T> {
  const change = statusChangeOf(project, project.endDate, today);
  return change ? { ...project, status: change.to, statusChange: change } : project;
}
