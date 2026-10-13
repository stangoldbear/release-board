import { isIsoDate } from '../utils/dateUtils';
import { isValidManDays } from './assignments';
import { TASK_COLOR_IDS, isKnownColorId } from './colors';
import { isRemindDays } from './projectReminders';
import type { TaskColorId } from './colors';
import { parseFieldValues } from './roadmapConfig';
import type {
  Project,
  ProjectArrangement,
  ProjectContingency,
  ProjectFieldValues,
  ProjectStatus,
} from './types';

/** Longest title, owner and description of a project; the security rules enforce the same. */
export const PROJECT_TITLE_MAX = 200;
export const PROJECT_OWNER_MAX = 100;
export const PROJECT_DESCRIPTION_MAX = 5000;

/** A new project is blue, apart from the yellow of the new tasks. */
export const DEFAULT_PROJECT_COLOR_ID: TaskColorId = 'blue';

/** The color for a new project with free colors: the one after the color of the last project. */
export function nextProjectColor(projects: readonly Pick<Project, 'colorId'>[]): TaskColorId {
  const last = projects.at(-1);
  if (!last) return DEFAULT_PROJECT_COLOR_ID;
  const at = TASK_COLOR_IDS.indexOf(last.colorId);
  return TASK_COLOR_IDS[(at + 1) % TASK_COLOR_IDS.length] ?? DEFAULT_PROJECT_COLOR_ID;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: 'Idea',
  planned: 'Pianificato',
  in_progress: 'In corso',
  completed: 'Completato',
  on_hold: 'In pausa',
};

export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];

/** Each arrangement with its name and what it does, for the window of the project. */
export const PROJECT_ARRANGEMENT_INFO: Record<
  ProjectArrangement,
  { label: string; description: string }
> = {
  standard: {
    label: 'Standard',
    description:
      'L’analisi dall’inizio, poi i team di sviluppo in parallelo, poi i test, poi la contingency.',
  },
  parallel: {
    label: 'Tutti in parallelo',
    description: 'Ogni persona parte dall’inizio del progetto; la contingency dopo l’ultima.',
  },
  sequence: {
    label: 'In sequenza',
    description:
      'Una persona dopo l’altra, nell’ordine delle fasi e dei team; la contingency per ultima.',
  },
  manual: {
    label: 'Manuale',
    description: 'Le barre restano dove sono state spostate.',
  },
};

export const PROJECT_ARRANGEMENTS = Object.keys(PROJECT_ARRANGEMENT_INFO) as ProjectArrangement[];

export const DEFAULT_ARRANGEMENT: ProjectArrangement = 'standard';

export function isProjectArrangement(value: unknown): value is ProjectArrangement {
  return (PROJECT_ARRANGEMENTS as readonly unknown[]).includes(value);
}

/** A position in the order of the projects: a finite number, as the rules want it. */
export function isPosition(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** The arrangement of a project: standard until it says otherwise. */
export function arrangementOf(project: Pick<Project, 'arrangement'>): ProjectArrangement {
  return project.arrangement ?? DEFAULT_ARRANGEMENT;
}

/** What a new project holds. */
export type ProjectContent = Omit<Project, 'id'>;

/** A project whose end is known: the effective one, as the roadmap draws it. */
export type ProjectWithEnd = Project & { endDate: string };

/** Fields of a project to change; null removes an optional one. */
export interface ProjectChanges {
  title?: string;
  startDate?: string;
  deadline?: string | null;
  remindDaysBefore?: number | null;
  contingency?: ProjectContingency | null;
  arrangement?: ProjectArrangement | null;
  position?: number;
  colorId?: TaskColorId;
  status?: ProjectStatus;
  owner?: string | null;
  description?: string | null;
  /** All the values of the custom fields at once: they are one field of the project. */
  fields?: ProjectFieldValues | null;
}

/** The values written the same way whatever the order of their keys, to compare them. */
function canonicalFields(values: ProjectFieldValues | undefined): string {
  if (!values) return '';
  return JSON.stringify(
    Object.keys(values)
      .sort()
      .map((key) => [key, values[key]]),
  );
}

/**
 * The rows of the roadmap when no other order is asked: by start, then title; the id breaks ties,
 * for every copy.
 */
export function sortProjects<T extends Project>(projects: readonly T[]): T[] {
  return [...projects].sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      a.title.localeCompare(b.title) ||
      a.id.localeCompare(b.id),
  );
}

export function isValidContingency(value: unknown): value is ProjectContingency {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => key === 'startDate' || key === 'manDays') &&
    isIsoDate((value as { startDate?: unknown }).startDate) &&
    isValidManDays((value as { manDays?: unknown }).manDays)
  );
}

function sameContingency(a: ProjectContingency | undefined, b: ProjectContingency | undefined) {
  return a?.startDate === b?.startDate && a?.manDays === b?.manDays;
}

/**
 * The fields that differ between a project and what the editor saves. Text is trimmed, and a
 * blank or absent optional field removes it.
 */
export function diffProject(before: Project, after: ProjectContent): ProjectChanges {
  const changes: ProjectChanges = {};
  const title = after.title.trim();
  if (title !== before.title) changes.title = title;
  if (after.startDate !== before.startDate) changes.startDate = after.startDate;
  if (after.deadline !== before.deadline) changes.deadline = after.deadline ?? null;
  if (after.remindDaysBefore !== before.remindDaysBefore) {
    changes.remindDaysBefore = after.remindDaysBefore ?? null;
  }
  if (!sameContingency(after.contingency, before.contingency)) {
    changes.contingency = after.contingency ?? null;
  }
  if (arrangementOf(after) !== arrangementOf(before)) changes.arrangement = arrangementOf(after);
  if (after.colorId !== before.colorId) changes.colorId = after.colorId;
  if (after.status !== before.status) changes.status = after.status;
  const owner = after.owner?.trim() || undefined;
  if (owner !== before.owner) changes.owner = owner ?? null;
  const description = after.description?.trim() || undefined;
  if (description !== before.description) changes.description = description ?? null;
  const fields = after.fields && Object.keys(after.fields).length > 0 ? after.fields : undefined;
  if (canonicalFields(fields) !== canonicalFields(before.fields)) changes.fields = fields ?? null;
  return changes;
}

type Data = Record<string, unknown>;

function isData(value: unknown): value is Data {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Text to keep: undefined when absent or blank, null when not a text or too long. */
function optionalText(value: unknown, max: number): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > max) return null;
  return value.trim() ? value : undefined;
}

export type ParsedProject = { content: ProjectContent } | { problems: string[] };

/**
 * A project from its data, as a backup or a document holds it, or the problems in words. An
 * unknown color is a problem, or the default color when `repairColor` is set, as for the
 * documents written by an older version.
 */
export function parseProjectData(value: unknown, repairColor = false): ParsedProject {
  if (!isData(value)) return { problems: ['formato non valido'] };
  const problems: string[] = [];
  const title = typeof value.title === 'string' && value.title.trim() ? value.title : null;
  if (!title) problems.push('manca il titolo');
  else if (title.length > PROJECT_TITLE_MAX) problems.push('titolo troppo lungo');
  // The planned end and the days of the project of the versions before 0.16 are ignored.
  if (!isIsoDate(value.startDate)) problems.push('data di inizio non valida');
  if (value.deadline !== undefined && !isIsoDate(value.deadline)) {
    problems.push('deadline non valida');
  }
  if (value.contingency !== undefined && !isValidContingency(value.contingency)) {
    problems.push('contingency non valida');
  }
  if (value.position !== undefined && !isPosition(value.position)) {
    problems.push('posizione non valida');
  }
  if (value.remindDaysBefore !== undefined && !isRemindDays(value.remindDaysBefore)) {
    problems.push('avviso di scadenza non valido');
  }
  if (value.arrangement !== undefined && !isProjectArrangement(value.arrangement)) {
    problems.push('disposizione non valida');
  }
  const knownColor = typeof value.colorId === 'string' && isKnownColorId(value.colorId);
  if (!knownColor && !repairColor) problems.push('colore non riconosciuto');
  if (!(PROJECT_STATUSES as readonly unknown[]).includes(value.status)) {
    problems.push('stato non valido');
  }
  const owner = optionalText(value.owner, PROJECT_OWNER_MAX);
  if (owner === null) problems.push('responsabile non valido');
  const description = optionalText(value.description, PROJECT_DESCRIPTION_MAX);
  if (description === null) problems.push('descrizione non valida');
  const fields = value.fields === undefined ? undefined : parseFieldValues(value.fields);
  if (fields === null) problems.push('campi non validi');
  if (problems.length > 0) return { problems };

  const content: ProjectContent = {
    title: title as string,
    startDate: value.startDate as string,
    colorId: knownColor ? (value.colorId as TaskColorId) : DEFAULT_PROJECT_COLOR_ID,
    status: value.status as ProjectStatus,
  };
  if (isIsoDate(value.deadline)) content.deadline = value.deadline;
  if (isPosition(value.position)) content.position = value.position;
  if (isRemindDays(value.remindDaysBefore)) content.remindDaysBefore = value.remindDaysBefore;
  if (isValidContingency(value.contingency)) {
    content.contingency = {
      startDate: value.contingency.startDate,
      manDays: value.contingency.manDays,
    };
  }
  if (isProjectArrangement(value.arrangement) && value.arrangement !== DEFAULT_ARRANGEMENT) {
    content.arrangement = value.arrangement;
  }
  if (owner) content.owner = owner;
  if (description) content.description = description;
  if (fields && Object.keys(fields).length > 0) content.fields = fields;
  return { content };
}
