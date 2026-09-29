import type { DocumentData } from 'firebase/firestore';
import { DEFAULT_COLOR_ID, isKnownColorId } from '../../domain/colors';
import { BORDER_STYLES, DAILY_METRIC, TASK_STATUSES } from '../../domain/plan';
import type { DailyMetric, DailyNotes, Lane, PlanSnapshot, TaskItem } from '../../domain/types';
import { isIsoDate } from '../../utils/dateUtils';

// How the plan is laid out in Firestore, under plans/{planId}:
//   lanes/{laneId}                    name, position
//   tasks/{taskId}                    the task without its id
//   metrics/{metricId}                label, unit, decimals, position, visible
//   metrics/{metricId}/values/{date}  value
//   notes/{date}                      text
// Every document also carries updatedAt, updatedBy and lastHistoryId, added by the repository.
// Reading is lenient: the rules validate writes, and a document that does not fit is skipped.

/** The one plan of an instance. */
export const PLAN_ID = 'main';
export const METRIC_ID: string = DAILY_METRIC.id;

/** A document to write under the plan: its path relative to the plan, and its content. */
export interface ContentWrite {
  path: string;
  data: DocumentData;
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function oneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

/** The task's own fields, without empty optional ones: Firestore has no undefined. */
export function taskContent(task: Omit<TaskItem, 'id'>): DocumentData {
  const data: DocumentData = {
    laneId: task.laneId,
    title: task.title,
    startDate: task.startDate,
    endDate: task.endDate,
    colorId: task.colorId,
    borderStyle: task.borderStyle,
    status: task.status,
  };
  if (task.assignee) data.assignee = task.assignee;
  if (task.description) data.description = task.description;
  if (task.deliverables && task.deliverables.length > 0) data.deliverables = task.deliverables;
  return data;
}

export function readTask(id: string, data: DocumentData): TaskItem | null {
  const { laneId, title, startDate, endDate, colorId, borderStyle, status } = data;
  if (!isText(laneId) || !isText(title) || !isIsoDate(startDate) || !isIsoDate(endDate))
    return null;
  if (!oneOf(borderStyle, BORDER_STYLES) || !oneOf(status, TASK_STATUSES)) return null;
  const task: TaskItem = {
    id,
    laneId,
    title,
    startDate,
    endDate,
    colorId: typeof colorId === 'string' && isKnownColorId(colorId) ? colorId : DEFAULT_COLOR_ID,
    borderStyle,
    status,
  };
  if (typeof data.assignee === 'string' && data.assignee) task.assignee = data.assignee;
  if (typeof data.description === 'string' && data.description) task.description = data.description;
  if (Array.isArray(data.deliverables)) {
    const items: unknown[] = data.deliverables;
    task.deliverables = items.filter((item): item is string => typeof item === 'string');
  }
  return task;
}

export function readLane(id: string, data: DocumentData): { lane: Lane; position: number } | null {
  if (!isText(data.name)) return null;
  return {
    lane: { id, name: data.name },
    position: typeof data.position === 'number' ? data.position : Number.MAX_SAFE_INTEGER,
  };
}

export function readValue(date: string, data: DocumentData): DailyMetric | null {
  if (!isIsoDate(date) || typeof data.value !== 'number' || !Number.isFinite(data.value))
    return null;
  return { date, value: data.value };
}

export function readNote(date: string, data: DocumentData): [string, string] | null {
  if (!isIsoDate(date) || !isText(data.text)) return null;
  return [date, data.text];
}

export interface PlanParts {
  lanes: { lane: Lane; position: number }[];
  tasks: TaskItem[];
  values: DailyMetric[];
  notes: [string, string][];
}

/** The plan as the app sees it: lanes in position order, values and tasks in a stable order. */
export function buildPlan(parts: PlanParts): PlanSnapshot {
  const lanes = [...parts.lanes]
    .sort((a, b) => a.position - b.position || a.lane.id.localeCompare(b.lane.id))
    .map((item) => item.lane);
  const tasks = [...parts.tasks].sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id),
  );
  const metrics = [...parts.values].sort((a, b) => a.date.localeCompare(b.date));
  const dailyNotes: DailyNotes = Object.fromEntries(parts.notes);
  return { lanes, tasks, metrics, dailyNotes };
}

/** The definition of the plan's only metric, in this version. */
export function metricContent(): DocumentData {
  return {
    label: DAILY_METRIC.label,
    unit: DAILY_METRIC.unit,
    decimals: DAILY_METRIC.decimals,
    position: 0,
    visible: true,
  };
}

/** Every document that represents the plan's content. */
export function contentWrites(plan: PlanSnapshot): ContentWrite[] {
  return [
    ...plan.lanes.map((lane, position) => ({
      path: `lanes/${lane.id}`,
      data: { name: lane.name, position },
    })),
    { path: `metrics/${METRIC_ID}`, data: metricContent() },
    ...plan.metrics.map(({ date, value }) => ({
      path: `metrics/${METRIC_ID}/values/${date}`,
      data: { value },
    })),
    ...Object.entries(plan.dailyNotes).map(([date, text]) => ({
      path: `notes/${date}`,
      data: { text },
    })),
    ...plan.tasks.map(({ id, ...content }) => ({
      path: `tasks/${id}`,
      data: taskContent(content),
    })),
  ];
}

/** The paths of the plan's content documents, to find the ones an import must delete. */
export function contentPaths(plan: PlanSnapshot): string[] {
  return contentWrites(plan).map((write) => write.path);
}

/** Splits a list into runs of at most `size` items. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}

/** What an import writes, for the history entry that records it. */
export function importSummary(plan: PlanSnapshot): string {
  const notes = Object.keys(plan.dailyNotes).length;
  return [
    `${plan.lanes.length} ${plan.lanes.length === 1 ? 'corsia' : 'corsie'}`,
    `${plan.tasks.length} attività`,
    `${plan.metrics.length} valori giornalieri`,
    `${notes} ${notes === 1 ? 'nota' : 'note'}`,
  ].join(', ');
}
