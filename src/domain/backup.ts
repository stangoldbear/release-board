import { DEFAULT_COLOR_ID, isKnownColorId, normalizeColorId } from './colors';
import type { DailyMetric, DailyNotes, Lane, PlanSnapshot, TaskItem } from './types';
import { formatDateToIT, formatDateToISO, isIsoDate } from '../utils/dateUtils';
import { parseLocaleNumber } from './numberFormat';
import { BORDER_STYLES, DAILY_METRIC, TASK_STATUSES } from './plan';

export const BACKUP_FORMAT = 'release-board/backup';
export const BACKUP_SCHEMA_VERSION = 3;
/** Larger files are rejected before parsing: a real plan weighs a few hundred kilobytes. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const MAX_REPORTED_ERRORS = 20;

/** A daily metric as stored in a backup: its definition plus the values by date. */
export interface BackupMetric {
  id: string;
  label: string;
  unit: string;
  decimals: number;
  values: DailyMetric[];
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  lanes: Lane[];
  tasks: TaskItem[];
  metrics: BackupMetric[];
  notes: { date: string; text: string }[];
}

/** Where a restored plan came from: a current backup or a file of the previous app version. */
export type BackupSource = 'current' | 'legacy-v2';

export type BackupParseResult =
  | { ok: true; plan: PlanSnapshot; source: BackupSource; exportedAt: string | null }
  | { ok: false; errors: string[] };

type JsonObject = Record<string, unknown>;

export function createBackupFile(plan: PlanSnapshot, exportedAt: Date): BackupFile {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    lanes: plan.lanes,
    tasks: plan.tasks,
    metrics: [{ ...DAILY_METRIC, values: [...plan.metrics].sort(byDate) }],
    notes: Object.entries(plan.dailyNotes)
      .map(([date, text]) => ({ date, text }))
      .sort(byDate),
  };
}

export function serializeBackup(file: BackupFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

export function backupFileName(date: Date, suffix?: string): string {
  return `release-board-backup-${formatDateToISO(date)}${suffix ? `-${suffix}` : ''}.json`;
}

export function parseBackupText(text: string): BackupParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return failure('Il file non contiene JSON valido.');
  }
  return parseBackup(value);
}

/** Validates a backup (current or previous format) and returns the plan it contains. */
export function parseBackup(value: unknown): BackupParseResult {
  if (!isObject(value)) return failure('Il file non contiene un backup.');

  if (value.format === BACKUP_FORMAT) {
    if (value.schemaVersion === BACKUP_SCHEMA_VERSION) return readPlan(value, 'current');
    const newer =
      typeof value.schemaVersion === 'number' && value.schemaVersion > BACKUP_SCHEMA_VERSION;
    return failure(
      newer
        ? 'Il backup è stato creato con una versione più recente di Release Board.'
        : 'Versione del backup non supportata.',
    );
  }

  if (typeof value.version === 'string' && value.version.startsWith('2.')) {
    return readPlan(migrateFromV2(value), 'legacy-v2');
  }

  return failure('Il file non è un backup di Release Board.');
}

/**
 * Maps a file of the previous app version to the current shape. Only known fields are copied;
 * the result goes through the same validation as a current backup.
 */
function migrateFromV2(v2: JsonObject): JsonObject {
  const lanes = Array.isArray(v2.lanes)
    ? v2.lanes.map((lane: unknown) => (isObject(lane) ? { id: lane.id, name: lane.name } : lane))
    : v2.lanes;

  const tasks = Array.isArray(v2.tasks)
    ? v2.tasks.map((task: unknown) =>
        isObject(task)
          ? {
              id: task.id,
              title: task.title,
              laneId: task.laneId,
              startDate: task.startDate,
              endDate: task.endDate,
              colorId:
                typeof task.colorId === 'string'
                  ? normalizeColorId(task.colorId)
                  : DEFAULT_COLOR_ID,
              borderStyle: task.borderStyle ?? 'dashed',
              status: task.status ?? 'planned',
              assignee: task.assignee,
              description: task.description,
              deliverables: task.deliverables,
            }
          : task,
      )
    : v2.tasks;

  const values = Array.isArray(v2.metrics)
    ? v2.metrics.map((metric: unknown) =>
        isObject(metric) ? { date: metric.date, value: legacyMetricValue(metric) } : metric,
      )
    : [];

  const notes = isObject(v2.dailyNotes)
    ? Object.entries(v2.dailyNotes)
        .filter(([, text]) => typeof text !== 'string' || text.trim() !== '')
        .map(([date, text]) => ({ date, text }))
    : [];

  return {
    exportedAt: v2.updatedAt,
    lanes,
    tasks,
    metrics: [{ ...DAILY_METRIC, values }],
    notes,
  };
}

function legacyMetricValue(metric: JsonObject): unknown {
  if (typeof metric.raw === 'number') return metric.raw;
  if (typeof metric.value === 'string') return parseLocaleNumber(metric.value) ?? metric.value;
  return metric.value;
}

function readPlan(file: JsonObject, source: BackupSource): BackupParseResult {
  const errors: string[] = [];
  const lanes = readLanes(file.lanes, errors);
  const tasks = readTasks(file.tasks, new Set(lanes.map((lane) => lane.id)), errors);
  const metrics = readMetrics(file.metrics, errors);
  const dailyNotes = readNotes(file.notes, errors);

  if (errors.length > 0) return { ok: false, errors: limitErrors(errors) };
  return {
    ok: true,
    plan: { lanes, tasks, metrics, dailyNotes },
    source,
    exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : null,
  };
}

function readLanes(value: unknown, errors: string[]): Lane[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('Il backup deve contenere almeno una corsia.');
    return [];
  }
  const lanes: Lane[] = [];
  value.forEach((item: unknown, index) => {
    const where = `Corsia ${index + 1}`;
    if (!isObject(item) || !isFilledString(item.id) || typeof item.name !== 'string') {
      errors.push(`${where}: servono un identificativo e un nome.`);
    } else if (lanes.some((lane) => lane.id === item.id)) {
      errors.push(`${where}: identificativo "${item.id}" ripetuto.`);
    } else {
      lanes.push({ id: item.id, name: item.name });
    }
  });
  return lanes;
}

function readTasks(value: unknown, laneIds: Set<string>, errors: string[]): TaskItem[] {
  if (!Array.isArray(value)) {
    errors.push("Il backup non contiene l'elenco delle attività.");
    return [];
  }
  const tasks: TaskItem[] = [];
  const seenIds = new Set<string>();

  value.forEach((item: unknown, index) => {
    if (!isObject(item)) {
      errors.push(`Attività ${index + 1}: formato non valido.`);
      return;
    }
    const id = isFilledString(item.id) ? item.id : null;
    const title = isFilledString(item.title) ? item.title : null;
    const laneId = isFilledString(item.laneId) && laneIds.has(item.laneId) ? item.laneId : null;
    const startDate = isIsoDate(item.startDate) ? item.startDate : null;
    const endDate = isIsoDate(item.endDate) ? item.endDate : null;
    const colorId =
      typeof item.colorId === 'string' && isKnownColorId(item.colorId) ? item.colorId : null;
    const borderStyle = oneOf(item.borderStyle, BORDER_STYLES);
    const status = oneOf(item.status, TASK_STATUSES);
    const assignee = optionalString(item.assignee);
    const description = optionalString(item.description);
    const deliverables = optionalStringList(item.deliverables);

    const problems: string[] = [];
    if (!id) problems.push("manca l'identificativo");
    else if (seenIds.has(id)) problems.push(`identificativo "${id}" ripetuto`);
    if (!title) problems.push('manca il titolo');
    if (!laneId) problems.push('corsia inesistente');
    if (!startDate) problems.push('data di inizio non valida');
    if (!endDate) problems.push('data di fine non valida');
    if (startDate && endDate && endDate < startDate) problems.push("la fine precede l'inizio");
    if (!colorId) problems.push('colore non riconosciuto');
    if (!borderStyle) problems.push('bordo non valido');
    if (!status) problems.push('stato non valido');
    if (assignee === null) problems.push('assegnatario non valido');
    if (description === null) problems.push('descrizione non valida');
    if (deliverables === null) problems.push('checklist non valida');

    if (
      problems.length > 0 ||
      !id ||
      !title ||
      !laneId ||
      !startDate ||
      !endDate ||
      !colorId ||
      !borderStyle ||
      !status ||
      assignee === null ||
      description === null ||
      deliverables === null
    ) {
      const name = title ? `"${title.replace(/\s+/g, ' ').trim()}"` : String(index + 1);
      errors.push(`Attività ${name}: ${problems.join(', ')}.`);
      return;
    }

    seenIds.add(id);
    const task: TaskItem = { id, title, laneId, startDate, endDate, colorId, borderStyle, status };
    if (assignee !== undefined) task.assignee = assignee;
    if (description !== undefined) task.description = description;
    if (deliverables !== undefined) task.deliverables = deliverables;
    tasks.push(task);
  });
  return tasks;
}

function readMetrics(value: unknown, errors: string[]): DailyMetric[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push('Metriche: formato non valido.');
    return [];
  }
  if (value.length > 1) {
    errors.push('Questa versione gestisce una sola metrica giornaliera.');
    return [];
  }
  const metric: unknown = value[0];
  if (metric === undefined) return [];
  if (!isObject(metric) || !Array.isArray(metric.values)) {
    errors.push('Metrica: formato non valido.');
    return [];
  }

  const values: DailyMetric[] = [];
  metric.values.forEach((entry: unknown, index) => {
    const date = isObject(entry) && isIsoDate(entry.date) ? entry.date : null;
    const amount =
      isObject(entry) && typeof entry.value === 'number' && Number.isFinite(entry.value)
        ? entry.value
        : null;
    const where = date ? `Metrica del ${formatDateToIT(date)}` : `Metrica ${index + 1}`;
    if (!date) errors.push(`${where}: data non valida.`);
    else if (values.some((existing) => existing.date === date))
      errors.push(`${where}: data ripetuta.`);
    else if (amount === null) errors.push(`${where}: valore non numerico.`);
    else values.push({ date, value: amount });
  });
  return values;
}

function readNotes(value: unknown, errors: string[]): DailyNotes {
  const notes: DailyNotes = {};
  if (value === undefined) return notes;
  if (!Array.isArray(value)) {
    errors.push('Note: formato non valido.');
    return notes;
  }
  value.forEach((entry: unknown, index) => {
    const date = isObject(entry) && isIsoDate(entry.date) ? entry.date : null;
    const text = isObject(entry) && typeof entry.text === 'string' ? entry.text : null;
    if (!date || text === null)
      errors.push(`Nota ${index + 1}: servono una data valida e un testo.`);
    else if (Object.hasOwn(notes, date))
      errors.push(`Nota del ${formatDateToIT(date)}: data ripetuta.`);
    else if (text.trim() !== '') notes[date] = text;
  });
  return notes;
}

function limitErrors(errors: string[]): string[] {
  if (errors.length <= MAX_REPORTED_ERRORS) return errors;
  const hidden = errors.length - MAX_REPORTED_ERRORS;
  return [...errors.slice(0, MAX_REPORTED_ERRORS), `…e altri ${hidden} problemi.`];
}

function failure(message: string): BackupParseResult {
  return { ok: false, errors: [message] };
}

function byDate(a: { date: string }, b: { date: string }): number {
  return a.date.localeCompare(b.date);
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFilledString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function oneOf<T extends string>(value: unknown, options: readonly T[]): T | null {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/** undefined when absent, null when present but not a string. */
function optionalString(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value : null;
}

/** undefined when absent, null when present but not a list of strings. */
function optionalStringList(value: unknown): string[] | undefined | null {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;
  const items: unknown[] = value;
  return items.every((item): item is string => typeof item === 'string') ? items : null;
}
