import type { DocumentData } from 'firebase/firestore';
import { APPROVAL_LIGHTS } from '../../domain/approval';
import { parseAssignment, sortAssignments } from '../../domain/assignments';
import { DEFAULT_COLOR_ID, isKnownColorId } from '../../domain/colors';
import { sortMemos } from '../../domain/memos';
import { parseProjectNote, sortProjectNotes } from '../../domain/projectNotes';
import { PROJECT_STATUSES, sortProjects } from '../../domain/projects';
import {
  parseFieldValues,
  parseProjectField,
  parseStakeholder,
  parseTeam,
  sortByPosition,
} from '../../domain/roadmapConfig';
import { BORDER_STYLES, DAILY_METRIC, TASK_STATUSES, planContentSummary } from '../../domain/plan';
import type {
  Assignment,
  DailyMetric,
  DailyNotes,
  Lane,
  Memo,
  MemoAuthor,
  PlanSnapshot,
  Project,
  ProjectField,
  ProjectNote,
  Stakeholder,
  TaskItem,
  Team,
} from '../../domain/types';
import { isIsoDate } from '../../utils/dateUtils';

// How the plan is laid out in Firestore, under plans/{planId}:
//   lanes/{laneId}                    name, position
//   tasks/{taskId}                    the task without its id
//   metrics/{metricId}                label, unit, decimals, position, visible
//   metrics/{metricId}/values/{date}  value, and from a forecast approval, promoEu, promoNonEu
//   notes/{date}                      text
//   memos/{memoId}                    title, position, author, and body, colorId, remindOn when set
//   members/{githubId}/memos/{memoId} a member's private free notes: the same without author
//   projects/{projectId}              the project of the roadmap without its id, fields included
//   projectNotes/{noteId}             projectId, text, createdAt, author, and the optional fields
//   assignments/{assignmentId}        projectId, stakeholderId, startDate, manDays, and note when set
//   projectFields/{fieldId}           a custom field of the projects, as the settings define it
//   teams/{teamId}                    name, tag, colorId, position
//   stakeholders/{stakeholderId}      name, teamId, absences, position, and info when set
// Every document but the private notes also carries updatedAt, updatedBy and lastHistoryId,
// added by the repository: private notes leave no history, since nobody else may read them.
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
  const metric: DailyMetric = { date, value: data.value };
  if (oneOf(data.approval, APPROVAL_LIGHTS)) metric.approval = data.approval;
  if (isText(data.promoEu)) metric.promoEu = data.promoEu;
  if (isText(data.promoNonEu)) metric.promoNonEu = data.promoNonEu;
  return metric;
}

/** A daily value without its date, which is the document id, and without empty details. */
export function valueContent(metric: DailyMetric): DocumentData {
  const data: DocumentData = { value: metric.value };
  if (metric.approval) data.approval = metric.approval;
  if (metric.promoEu) data.promoEu = metric.promoEu;
  if (metric.promoNonEu) data.promoNonEu = metric.promoNonEu;
  return data;
}

export function readNote(date: string, data: DocumentData): [string, string] | null {
  if (!isIsoDate(date) || !isText(data.text)) return null;
  return [date, data.text];
}

/**
 * A free note without its id, which is the document id, and without empty fields. The author
 * goes with shared notes only: a private note sits under its author's member document.
 */
export function memoContent(memo: Omit<Memo, 'id'>): DocumentData {
  const data: DocumentData = { title: memo.title, position: memo.position };
  if (memo.body) data.body = memo.body;
  if (memo.colorId) data.colorId = memo.colorId;
  if (memo.remindOn) data.remindOn = memo.remindOn;
  if (memo.author && !memo.private) data.author = { id: memo.author.id, login: memo.author.login };
  return data;
}

function readAuthor(value: unknown): MemoAuthor | null {
  if (typeof value !== 'object' || value === null) return null;
  const { id, login } = value as Record<string, unknown>;
  return isText(id) && isText(login) ? { id, login } : null;
}

export function readMemo(id: string, data: DocumentData): Memo | null {
  if (!isText(data.title) || typeof data.position !== 'number' || !Number.isFinite(data.position))
    return null;
  const memo: Memo = { id, title: data.title, position: data.position };
  if (isText(data.body)) memo.body = data.body;
  if (typeof data.colorId === 'string' && isKnownColorId(data.colorId)) memo.colorId = data.colorId;
  if (isIsoDate(data.remindOn)) memo.remindOn = data.remindOn;
  const author = readAuthor(data.author);
  if (author) memo.author = author;
  return memo;
}

/** A private note: its author is the member whose document holds it. */
export function readPrivateMemo(id: string, data: DocumentData, author: MemoAuthor): Memo | null {
  const memo = readMemo(id, data);
  return memo && { ...memo, author, private: true };
}

/** A project without its id, which is the document id, and without empty optional fields. */
export function projectContent(project: Omit<Project, 'id'>): DocumentData {
  const data: DocumentData = {
    title: project.title,
    startDate: project.startDate,
    endDate: project.endDate,
    colorId: project.colorId,
    status: project.status,
  };
  if (project.owner) data.owner = project.owner;
  if (project.description) data.description = project.description;
  if (project.fields && Object.keys(project.fields).length > 0) data.fields = project.fields;
  return data;
}

export function readProject(id: string, data: DocumentData): Project | null {
  const { title, startDate, endDate, colorId, status } = data;
  if (!isText(title) || !isIsoDate(startDate) || !isIsoDate(endDate) || endDate < startDate)
    return null;
  if (!oneOf(status, PROJECT_STATUSES)) return null;
  const project: Project = {
    id,
    title,
    startDate,
    endDate,
    colorId: typeof colorId === 'string' && isKnownColorId(colorId) ? colorId : DEFAULT_COLOR_ID,
    status,
  };
  if (isText(data.owner)) project.owner = data.owner;
  if (isText(data.description)) project.description = data.description;
  const fields = data.fields === undefined ? null : parseFieldValues(data.fields);
  if (fields && Object.keys(fields).length > 0) project.fields = fields;
  return project;
}

/** A note of a project without its id, and without empty optional fields. */
export function projectNoteContent(note: Omit<ProjectNote, 'id'>): DocumentData {
  const data: DocumentData = {
    projectId: note.projectId,
    text: note.text,
    createdAt: note.createdAt,
  };
  if (note.author) data.author = { id: note.author.id, login: note.author.login };
  if (note.status) data.status = note.status;
  if (note.dueOn) data.dueOn = note.dueOn;
  if (note.remind && note.dueOn) data.remind = true;
  if (note.owners && note.owners.length > 0) data.owners = note.owners;
  if (note.tags && note.tags.length > 0) data.tags = note.tags;
  return data;
}

export function readProjectNote(id: string, data: DocumentData): ProjectNote | null {
  return parseProjectNote(id, data);
}

/** An assignment without its id, and without an empty note. */
export function assignmentContent(assignment: Omit<Assignment, 'id'>): DocumentData {
  const data: DocumentData = {
    projectId: assignment.projectId,
    stakeholderId: assignment.stakeholderId,
    startDate: assignment.startDate,
    manDays: assignment.manDays,
  };
  if (assignment.note) data.note = assignment.note;
  return data;
}

export function readAssignment(id: string, data: DocumentData): Assignment | null {
  return parseAssignment(id, data);
}

/** A field definition without its id; the options go with the choice fields only. */
export function projectFieldContent(field: Omit<ProjectField, 'id'>): DocumentData {
  const data: DocumentData = {
    label: field.label,
    type: field.type,
    multiple: field.multiple,
    required: field.required,
    main: field.main,
    position: field.position,
  };
  if (field.description) data.description = field.description;
  if (field.type === 'choice' && field.options) {
    data.options = field.options.map((option) => ({ id: option.id, label: option.label }));
  }
  return data;
}

export function readProjectField(id: string, data: DocumentData): ProjectField | null {
  return parseProjectField(id, data, Number.MAX_SAFE_INTEGER);
}

export function teamContent(team: Omit<Team, 'id'>): DocumentData {
  return { name: team.name, tag: team.tag, colorId: team.colorId, position: team.position };
}

export function readTeam(id: string, data: DocumentData): Team | null {
  return parseTeam(id, data, Number.MAX_SAFE_INTEGER);
}

/** A stakeholder without their id; the absences always go, as a list, even when empty. */
export function stakeholderContent(stakeholder: Omit<Stakeholder, 'id'>): DocumentData {
  const data: DocumentData = {
    name: stakeholder.name,
    teamId: stakeholder.teamId,
    position: stakeholder.position,
    absences: stakeholder.absences.map((absence) => {
      const item: DocumentData = { start: absence.start, end: absence.end };
      if (absence.reason) item.reason = absence.reason;
      return item;
    }),
  };
  if (stakeholder.info) data.info = stakeholder.info;
  return data;
}

export function readStakeholder(id: string, data: DocumentData): Stakeholder | null {
  return parseStakeholder(id, data, Number.MAX_SAFE_INTEGER);
}

export interface PlanParts {
  lanes: { lane: Lane; position: number }[];
  tasks: TaskItem[];
  values: DailyMetric[];
  notes: [string, string][];
  memos: Memo[];
  projects: Project[];
  projectNotes: ProjectNote[];
  assignments: Assignment[];
  fields: ProjectField[];
  teams: Team[];
  stakeholders: Stakeholder[];
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
  return {
    lanes,
    tasks,
    metrics,
    dailyNotes,
    memos: sortMemos(parts.memos),
    projects: sortProjects(parts.projects),
    projectNotes: sortProjectNotes(parts.projectNotes),
    assignments: sortAssignments(parts.assignments),
    roadmap: {
      fields: sortByPosition(parts.fields),
      teams: sortByPosition(parts.teams),
      stakeholders: sortByPosition(parts.stakeholders),
    },
  };
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
    ...plan.metrics.map((metric) => ({
      path: `metrics/${METRIC_ID}/values/${metric.date}`,
      data: valueContent(metric),
    })),
    ...Object.entries(plan.dailyNotes).map(([date, text]) => ({
      path: `notes/${date}`,
      data: { text },
    })),
    ...plan.tasks.map(({ id, ...content }) => ({
      path: `tasks/${id}`,
      data: taskContent(content),
    })),
    // Private notes belong to their author, not to the plan.
    ...sharedMemos(plan).map(({ id, ...content }) => ({
      path: `memos/${id}`,
      data: memoContent(content),
    })),
    ...plan.projects.map(({ id, ...content }) => ({
      path: `projects/${id}`,
      data: projectContent(content),
    })),
    ...plan.projectNotes.map(({ id, ...content }) => ({
      path: `projectNotes/${id}`,
      data: projectNoteContent(content),
    })),
    ...plan.assignments.map(({ id, ...content }) => ({
      path: `assignments/${id}`,
      data: assignmentContent(content),
    })),
    ...configWrites(plan.roadmap),
  ];
}

/** The documents of the configuration of the roadmap: fields, teams and stakeholders. */
export function configWrites(config: PlanSnapshot['roadmap']): ContentWrite[] {
  return [
    ...config.fields.map(({ id, ...content }) => ({
      path: `projectFields/${id}`,
      data: projectFieldContent(content),
    })),
    ...config.teams.map(({ id, ...content }) => ({
      path: `teams/${id}`,
      data: teamContent(content),
    })),
    ...config.stakeholders.map(({ id, ...content }) => ({
      path: `stakeholders/${id}`,
      data: stakeholderContent(content),
    })),
  ];
}

function sharedMemos(plan: PlanSnapshot): Memo[] {
  return plan.memos.filter((memo) => !memo.private);
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
  return planContentSummary(plan).join(', ');
}
