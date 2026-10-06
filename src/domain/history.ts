import { formatDateToIT } from '../utils/dateUtils';
import { TASK_COLORS } from './colors';
import { formatLocaleNumber } from './numberFormat';
import { TASK_STATUS_LABELS } from './plan';
import { PROJECT_STATUS_LABELS } from './projects';
import type { ProjectStatus, TaskStatus } from './types';

export type HistoryEntity =
  'plan' | 'lane' | 'task' | 'metric' | 'value' | 'note' | 'memo' | 'project' | 'member';
export type HistoryAction = 'create' | 'update' | 'delete' | 'import' | 'setup';

/** One change to the plan: who did what, and when. */
export interface HistoryEntry {
  id: string;
  entity: HistoryEntity;
  entityId: string;
  action: HistoryAction;
  actor: { uid: string; githubId: string; login: string };
  /** Null while the server has not confirmed the write yet. */
  at: Date | null;
  /** The changed fields before and after, when the change was small enough to keep. */
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  /** A sentence for changes too large to keep, such as imports. */
  summary?: string;
}

const ENTITY_LABELS: Record<HistoryEntity, string> = {
  plan: 'il piano',
  lane: 'la corsia',
  task: "l'attività",
  metric: 'i valori giornalieri',
  value: 'il valore',
  note: 'la nota',
  memo: 'la nota libera',
  project: 'il progetto',
  member: 'il membro',
};

const ACTION_LABELS: Record<HistoryAction, string> = {
  create: 'ha aggiunto',
  update: 'ha modificato',
  delete: 'ha eliminato',
  import: 'ha importato',
  setup: 'ha creato',
};

/** What the history records; the security rules allow the same. */
export const HISTORY_ENTITIES = Object.keys(ENTITY_LABELS) as HistoryEntity[];
export const HISTORY_ACTIONS = Object.keys(ACTION_LABELS) as HistoryAction[];

export function isHistoryEntity(value: unknown): value is HistoryEntity {
  return (HISTORY_ENTITIES as unknown[]).includes(value);
}

export function isHistoryAction(value: unknown): value is HistoryAction {
  return (HISTORY_ACTIONS as unknown[]).includes(value);
}

function titleOf(entry: HistoryEntry): string | null {
  const title =
    entry.after?.title ?? entry.before?.title ?? entry.after?.login ?? entry.before?.login;
  return typeof title === 'string' && title.trim()
    ? `«${title.replace(/\s+/g, ' ').trim()}»`
    : null;
}

/** The days of a note that changed day: a move keeps the date before and after. */
function noteMove(entry: HistoryEntry): { from: string; to: string } | null {
  const from = entry.before?.date;
  const to = entry.after?.date;
  return entry.entity === 'note' &&
    typeof from === 'string' &&
    typeof to === 'string' &&
    from !== to
    ? { from, to }
    : null;
}

/** The one field of a free note that a change recorded before it, if it is only one. */
function onlyMemoField(entry: HistoryEntry): string | null {
  const changed = Object.keys(entry.before ?? {});
  return entry.entity === 'memo' && changed.length === 1 ? (changed[0] ?? null) : null;
}

/** What happened to a free note, when the action alone does not say it. */
function memoVerb(entry: HistoryEntry): string {
  switch (onlyMemoField(entry)) {
    case 'position':
      return 'ha spostato';
    // The others saw the note leave, or arrive with all its content.
    case 'private':
      return entry.after?.private === true ? 'ha reso privata' : 'ha condiviso';
    default:
      return ACTION_LABELS[entry.action];
  }
}

/** "ha fatto cosa", without who: the history page shows the author apart. */
export function describeChange(entry: HistoryEntry): string {
  if (entry.summary) return `${ACTION_LABELS[entry.action]}: ${entry.summary}`;
  // Free notes and projects are named with what they are: "il progetto «App mobile»".
  if (entry.entity === 'memo' || entry.entity === 'project') {
    const title = titleOf(entry);
    const label = ENTITY_LABELS[entry.entity];
    const what = title ? `${label} ${title}` : label;
    return `${entry.entity === 'memo' ? memoVerb(entry) : ACTION_LABELS[entry.action]} ${what}`;
  }
  const move = noteMove(entry);
  if (move) {
    return `ha spostato la nota dal ${formatDateToIT(move.from)} al ${formatDateToIT(move.to)}`;
  }
  const what =
    titleOf(entry) ??
    (entry.entity === 'note'
      ? `${ENTITY_LABELS.note} del ${formatDateToIT(entry.entityId)}`
      : ENTITY_LABELS[entry.entity]);
  return `${ACTION_LABELS[entry.action]} ${what}`;
}

/** "chi ha fatto cosa", to list the history. */
export function describeHistoryEntry(entry: HistoryEntry): string {
  return `${entry.actor.login || 'Qualcuno'} ${describeChange(entry)}`;
}

/** What a change is about, as the history page groups and filters it. */
export type HistoryKind =
  'task' | 'note' | 'memo' | 'project' | 'revenue' | 'lane' | 'member' | 'plan';

export const HISTORY_KIND_LABELS: Record<HistoryKind, string> = {
  task: 'Attività',
  note: 'Note',
  memo: 'Note libere',
  project: 'Progetti',
  revenue: 'Fatturato',
  lane: 'Corsie',
  member: 'Membri',
  plan: 'Piano',
};

export const HISTORY_KINDS = Object.keys(HISTORY_KIND_LABELS) as HistoryKind[];

export function historyKind(entry: HistoryEntry): HistoryKind {
  return entry.entity === 'metric' || entry.entity === 'value' ? 'revenue' : entry.entity;
}

/** One field of a change, written for people; a missing side was not recorded or was empty. */
export interface FieldChange {
  label: string;
  before?: string;
  after?: string;
}

const TASK_FIELDS: Record<string, string> = {
  title: 'Titolo',
  laneId: 'Corsia',
  startDate: 'Inizio',
  endDate: 'Fine',
  status: 'Stato',
  colorId: 'Colore',
  borderStyle: 'Bordo',
  assignee: 'Assegnatario',
  description: 'Descrizione',
  deliverables: 'Checklist',
};

/** Fields worth showing for a task that was added or deleted. */
const TASK_SUMMARY_FIELDS = ['laneId', 'startDate', 'endDate', 'status'];

const PROJECT_FIELDS: Record<string, string> = {
  title: 'Titolo',
  startDate: 'Inizio',
  endDate: 'Fine',
  status: 'Stato',
  colorId: 'Colore',
  owner: 'Responsabile',
  description: 'Descrizione',
};

/** Fields worth showing for a project that was added or deleted. */
const PROJECT_SUMMARY_FIELDS = ['startDate', 'endDate', 'status', 'owner'];

const MEMO_FIELDS: Record<string, string> = {
  title: 'Titolo',
  body: 'Testo',
  colorId: 'Colore',
  remindOn: 'Promemoria',
  private: 'Visibilità',
};

function formatField(
  entity: HistoryEntity,
  field: string,
  value: unknown,
  laneName: (id: string) => string | undefined,
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? 'voce' : 'voci'}`;
  if (typeof value === 'number') return formatLocaleNumber(value, Number.isInteger(value) ? 0 : 2);
  if (typeof value === 'boolean' && field === 'private') return value ? 'Privata' : 'Condivisa';
  if (typeof value !== 'string') return undefined;
  switch (field) {
    case 'startDate':
    case 'endDate':
    case 'date':
    case 'remindOn':
      return formatDateToIT(value);
    case 'status':
      return (
        (entity === 'project'
          ? PROJECT_STATUS_LABELS[value as ProjectStatus]
          : TASK_STATUS_LABELS[value as TaskStatus]) ?? value
      );
    case 'colorId':
      return TASK_COLORS.find((color) => color.id === value)?.name ?? value;
    case 'borderStyle':
      return value === 'dashed' ? 'Tratteggiato' : 'Continuo';
    case 'laneId':
      return laneName(value) ?? value;
    default:
      return value;
  }
}

/**
 * What changed, field by field, for the changes that keep it: tasks, notes and daily values.
 * `laneName` turns the id of a lane into its name.
 */
export function fieldChanges(
  entry: HistoryEntry,
  laneName: (id: string) => string | undefined,
): FieldChange[] {
  const before = entry.before ?? {};
  const after = entry.after ?? {};
  const pair = (field: string, label: string): FieldChange => ({
    label,
    before: formatField(entry.entity, field, before[field], laneName),
    after: formatField(entry.entity, field, after[field], laneName),
  });

  if (entry.entity === 'task') {
    // An update keeps the title in `after` only to name the task: it changed if `before` has it.
    const fields =
      entry.action === 'update'
        ? Object.keys(TASK_FIELDS).filter(
            (field) => field in before || (field !== 'title' && field in after),
          )
        : TASK_SUMMARY_FIELDS;
    return fields
      .map((field) => pair(field, TASK_FIELDS[field] ?? field))
      .filter((change) => change.before !== undefined || change.after !== undefined);
  }
  if (entry.entity === 'project') {
    // An update keeps the title in `after` only to name the project, as for tasks.
    const fields =
      entry.action === 'update'
        ? Object.keys(PROJECT_FIELDS).filter(
            (field) => field in before || (field !== 'title' && field in after),
          )
        : PROJECT_SUMMARY_FIELDS;
    return fields
      .map((field) => pair(field, PROJECT_FIELDS[field] ?? field))
      .filter((change) => change.before !== undefined || change.after !== undefined);
  }
  if (entry.entity === 'memo') {
    // An update keeps the title in `after` only to name the note, as for tasks.
    return Object.entries(MEMO_FIELDS)
      .filter(
        ([field]) =>
          entry.action !== 'update' || field in before || (field !== 'title' && field in after),
      )
      .map(([field, label]) => pair(field, label))
      .filter((change) => change.before !== undefined || change.after !== undefined);
  }
  if (entry.entity === 'note') {
    const changes = [pair('date', 'Giorno'), pair('text', 'Testo')];
    return changes.filter(
      (change) =>
        (change.before !== undefined || change.after !== undefined) &&
        change.before !== change.after,
    );
  }
  if (entry.entity === 'metric' && entry.action === 'update' && !entry.before) {
    // Daily values saved by hand: the value of each day, or its removal.
    return Object.entries(after)
      .filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        label: formatDateToIT(date),
        after: value === null ? 'Rimosso' : formatField(entry.entity, 'value', value, laneName),
      }));
  }
  return [];
}
