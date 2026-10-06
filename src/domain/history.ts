import { formatDateToIT } from '../utils/dateUtils';
import { TASK_COLORS } from './colors';
import { formatLocaleNumber } from './numberFormat';
import { TASK_STATUS_LABELS } from './plan';
import { PROJECT_NOTE_STATUS_LABELS } from './projectNotes';
import { PROJECT_STATUS_LABELS } from './projects';
import { FIELD_TYPE_INFO, isFieldType } from './roadmapConfig';
import type { ProjectNoteStatus, ProjectStatus, TaskStatus } from './types';

export type HistoryEntity =
  | 'plan'
  | 'lane'
  | 'task'
  | 'metric'
  | 'value'
  | 'note'
  | 'memo'
  | 'project'
  | 'projectNote'
  | 'assignment'
  | 'projectField'
  | 'team'
  | 'stakeholder'
  | 'member';
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
  projectNote: 'la nota del progetto',
  assignment: "l'assegnazione",
  projectField: 'il campo dei progetti',
  team: 'il team',
  stakeholder: 'la persona del team',
  member: 'il membro',
};

/** Entities named by what they are and their title: "il progetto «App mobile»". */
const TITLED_ENTITIES: readonly HistoryEntity[] = [
  'memo',
  'project',
  'projectNote',
  'assignment',
  'projectField',
  'team',
  'stakeholder',
];

/** The longest piece of a note's text that names it in the history. */
const NOTE_TITLE_MAX = 60;

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

/** What names an entry: a title, a name, a label, a username, or the start of a note's text. */
function titleOf(entry: HistoryEntry): string | null {
  const first = (field: string) => entry.after?.[field] ?? entry.before?.[field];
  const title = first('title') ?? first('name') ?? first('label') ?? first('login');
  if (typeof title === 'string' && title.trim()) return `«${title.replace(/\s+/g, ' ').trim()}»`;
  // Only the notes of the projects go by their text: a note of a day goes by its day.
  if (entry.entity !== 'projectNote') return null;
  const text = first('text');
  if (typeof text !== 'string' || !text.trim()) return null;
  const line = text.replace(/\s+/g, ' ').trim();
  return `«${line.length > NOTE_TITLE_MAX ? `${line.slice(0, NOTE_TITLE_MAX - 1).trimEnd()}…` : line}»`;
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
  // Free notes, projects and what goes with them are named with what they are.
  if (TITLED_ENTITIES.includes(entry.entity)) {
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
  'task' | 'note' | 'memo' | 'project' | 'roadmap' | 'revenue' | 'lane' | 'member' | 'plan';

export const HISTORY_KIND_LABELS: Record<HistoryKind, string> = {
  task: 'Attività',
  note: 'Note',
  memo: 'Note libere',
  project: 'Progetti',
  roadmap: 'Team e campi',
  revenue: 'Fatturato',
  lane: 'Corsie',
  member: 'Membri',
  plan: 'Piano',
};

export const HISTORY_KINDS = Object.keys(HISTORY_KIND_LABELS) as HistoryKind[];

/** The kind of an entry: the notes and assignments go with their projects, the setup apart. */
export function historyKind(entry: HistoryEntry): HistoryKind {
  switch (entry.entity) {
    case 'metric':
    case 'value':
      return 'revenue';
    case 'projectNote':
    case 'assignment':
      return 'project';
    case 'projectField':
    case 'team':
    case 'stakeholder':
      return 'roadmap';
    default:
      return entry.entity;
  }
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
  fields: 'Campi',
};

/** Fields worth showing for a project that was added or deleted. */
const PROJECT_SUMMARY_FIELDS = ['startDate', 'endDate', 'status', 'owner'];

/** The fields of the entities that go with the projects, named the same way in every change. */
const ROADMAP_FIELDS: Partial<Record<HistoryEntity, Record<string, string>>> = {
  projectNote: {
    text: 'Testo',
    status: 'Stato',
    dueOn: 'Scadenza',
    remind: 'Avviso',
    owners: 'Owner',
    tags: 'Tag',
  },
  assignment: {
    stakeholderId: 'Persona',
    startDate: 'Inizio',
    manDays: 'Giorni',
    note: 'Nota',
  },
  projectField: {
    label: 'Etichetta',
    description: 'Descrizione',
    type: 'Tipo',
    multiple: 'Più valori',
    required: 'Almeno uno',
    main: 'Principale',
    group: 'Raggruppa',
    options: 'Valori',
    position: 'Posizione',
  },
  team: { name: 'Nome', tag: 'Tag', colorId: 'Colore', position: 'Posizione' },
  stakeholder: {
    name: 'Nome',
    teamId: 'Team',
    info: 'Info',
    absences: 'Assenze',
    position: 'Posizione',
  },
};

const MEMO_FIELDS: Record<string, string> = {
  title: 'Titolo',
  body: 'Testo',
  colorId: 'Colore',
  remindOn: 'Promemoria',
  private: 'Visibilità',
};

/** Options shown by name in a change: beyond these, the rest is counted. */
const OPTIONS_SHOWN = 8;

/** "iOS Dev (Azzurro), QA": the values of a list with their colors, so that a new color shows. */
function formatOptions(options: unknown[]): string {
  const names = options.map((option) => {
    if (typeof option !== 'object' || option === null) return '?';
    const { label, colorId } = option as { label?: unknown; colorId?: unknown };
    const color = TASK_COLORS.find((item) => item.id === colorId)?.name;
    const name = typeof label === 'string' ? label : '?';
    return color ? `${name} (${color})` : name;
  });
  const rest = names.length - OPTIONS_SHOWN;
  return rest > 0
    ? `${names.slice(0, OPTIONS_SHOWN).join(', ')} e altre ${rest}`
    : names.join(', ');
}

function formatField(
  entity: HistoryEntity,
  field: string,
  value: unknown,
  laneName: (id: string) => string | undefined,
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value) && field === 'options') return formatOptions(value);
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? 'voce' : 'voci'}`;
  if (typeof value === 'number') return formatLocaleNumber(value, Number.isInteger(value) ? 0 : 2);
  if (typeof value === 'boolean' && field === 'private') return value ? 'Privata' : 'Condivisa';
  if (typeof value === 'boolean') return value ? 'Sì' : 'No';
  if (typeof value === 'object' && field === 'fields') {
    const count = Object.keys(value).length;
    return `${count} ${count === 1 ? 'campo' : 'campi'}`;
  }
  if (typeof value !== 'string') return undefined;
  switch (field) {
    case 'startDate':
    case 'endDate':
    case 'date':
    case 'remindOn':
    case 'dueOn':
      return formatDateToIT(value);
    case 'status':
      return (
        (entity === 'project'
          ? PROJECT_STATUS_LABELS[value as ProjectStatus]
          : entity === 'projectNote'
            ? PROJECT_NOTE_STATUS_LABELS[value as ProjectNoteStatus]
            : TASK_STATUS_LABELS[value as TaskStatus]) ?? value
      );
    case 'type':
      return isFieldType(value) ? `${value} (${FIELD_TYPE_INFO[value].label})` : value;
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
  const roadmapFields = ROADMAP_FIELDS[entry.entity];
  if (roadmapFields) {
    // An update keeps what names the entity in `after` only to name it, as for tasks.
    const naming = ['text', 'name', 'label'];
    return Object.entries(roadmapFields)
      .filter(
        ([field]) =>
          entry.action !== 'update' ||
          field in before ||
          (!naming.includes(field) && field in after),
      )
      .map(([field, label]) => pair(field, label))
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
