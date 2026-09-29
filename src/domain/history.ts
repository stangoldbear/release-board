import { formatDateToIT } from '../utils/dateUtils';

export type HistoryEntity = 'plan' | 'lane' | 'task' | 'metric' | 'value' | 'note' | 'member';
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
  member: 'il membro',
};

const ACTION_LABELS: Record<HistoryAction, string> = {
  create: 'ha aggiunto',
  update: 'ha modificato',
  delete: 'ha eliminato',
  import: 'ha importato',
  setup: 'ha creato',
};

function titleOf(entry: HistoryEntry): string | null {
  const title =
    entry.after?.title ?? entry.before?.title ?? entry.after?.login ?? entry.before?.login;
  return typeof title === 'string' && title.trim()
    ? `«${title.replace(/\s+/g, ' ').trim()}»`
    : null;
}

/** "chi ha fatto cosa", to list the history. */
export function describeHistoryEntry(entry: HistoryEntry): string {
  const who = entry.actor.login || 'Qualcuno';
  if (entry.summary) return `${who} ${ACTION_LABELS[entry.action]}: ${entry.summary}`;
  const what =
    titleOf(entry) ??
    (entry.entity === 'note'
      ? `${ENTITY_LABELS.note} del ${formatDateToIT(entry.entityId)}`
      : ENTITY_LABELS[entry.entity]);
  return `${who} ${ACTION_LABELS[entry.action]} ${what}`;
}
