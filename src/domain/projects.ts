import type { TaskColorId } from './colors';
import type { Project, ProjectStatus } from './types';

/** Longest title, owner and description of a project; the security rules enforce the same. */
export const PROJECT_TITLE_MAX = 200;
export const PROJECT_OWNER_MAX = 100;
export const PROJECT_DESCRIPTION_MAX = 5000;

/** A new project is blue, apart from the yellow of the new tasks. */
export const DEFAULT_PROJECT_COLOR_ID: TaskColorId = 'blue';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: 'Idea',
  planned: 'Pianificato',
  in_progress: 'In corso',
  completed: 'Completato',
  on_hold: 'In pausa',
};

export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];

/** What a new project holds. */
export type ProjectContent = Omit<Project, 'id'>;

/** Fields of a project to change; null removes an optional one. */
export interface ProjectChanges {
  title?: string;
  startDate?: string;
  endDate?: string;
  colorId?: TaskColorId;
  status?: ProjectStatus;
  owner?: string | null;
  description?: string | null;
}

/** The rows of the roadmap: by start, then end, then title; the id breaks ties, for every copy. */
export function sortProjects(projects: readonly Project[]): Project[] {
  return [...projects].sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      a.endDate.localeCompare(b.endDate) ||
      a.title.localeCompare(b.title) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * The fields that differ between a project and what the editor saves. Text is trimmed, and blank
 * owner or description remove the field.
 */
export function diffProject(before: Project, after: ProjectContent): ProjectChanges {
  const changes: ProjectChanges = {};
  const title = after.title.trim();
  if (title !== before.title) changes.title = title;
  if (after.startDate !== before.startDate) changes.startDate = after.startDate;
  if (after.endDate !== before.endDate) changes.endDate = after.endDate;
  if (after.colorId !== before.colorId) changes.colorId = after.colorId;
  if (after.status !== before.status) changes.status = after.status;
  const owner = after.owner?.trim() || undefined;
  if (owner !== before.owner) changes.owner = owner ?? null;
  const description = after.description?.trim() || undefined;
  if (description !== before.description) changes.description = description ?? null;
  return changes;
}
