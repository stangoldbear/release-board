import { sortAssignments } from './assignments';
import type { AssignmentChanges } from './assignments';
import { applyChanges } from './changes';
import { memoMoves, sortMemos } from './memos';
import type { MemoChanges } from './memos';
import { sortProjectNotes } from './projectNotes';
import type { ProjectNoteChanges } from './projectNotes';
import { sortProjects } from './projects';
import type { ProjectChanges } from './projects';
import { defaultRoadmapConfig, sortByPosition } from './roadmapConfig';
import type {
  Assignment,
  BorderStyle,
  DailyMetric,
  Lane,
  Memo,
  PlanSnapshot,
  Project,
  ProjectField,
  ProjectNote,
  RoadmapConfig,
  Stakeholder,
  TaskItem,
  TaskStatus,
  Team,
} from './types';

export const DEFAULT_LANES: readonly Lane[] = [
  { id: 'lane-1', name: 'Frontend' },
  { id: 'lane-2', name: 'Backend' },
  { id: 'lane-3', name: 'Contenuti' },
];

/** The single daily metric of this version. Label and unit become configurable per plan later. */
export const DAILY_METRIC = { id: 'metric-1', label: 'Fatturato', unit: '€', decimals: 0 } as const;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  planned: 'Pianificato',
  in_progress: 'In corso',
  review: 'In revisione',
  completed: 'Completato',
  blocked: 'Bloccato',
};

export const TASK_STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];

export const BORDER_STYLES: readonly BorderStyle[] = ['dashed', 'solid'];

/** A plan with nothing in it but the default lanes and the default roadmap configuration. */
export function createEmptyPlan(): PlanSnapshot {
  return {
    lanes: DEFAULT_LANES.map((lane) => ({ ...lane })),
    tasks: [],
    metrics: [],
    dailyNotes: {},
    memos: [],
    projects: [],
    projectNotes: [],
    assignments: [],
    roadmap: defaultRoadmapConfig(),
  };
}

/**
 * What a plan holds, in words: "3 corsie", "11 attività"… for imports, backups and the history.
 * Private notes are not counted: they stay with their author and no backup carries them. The
 * configuration of the roadmap is not content, and is not counted either.
 */
export function planContentSummary(plan: PlanSnapshot): string[] {
  const values = plan.metrics.length;
  const notes = Object.keys(plan.dailyNotes).length;
  const memos = plan.memos.filter((memo) => !memo.private).length;
  const projectNotes = plan.projectNotes.length;
  const assignments = plan.assignments.length;
  return [
    `${plan.lanes.length} ${plan.lanes.length === 1 ? 'corsia' : 'corsie'}`,
    `${plan.tasks.length} attività`,
    `${values} ${values === 1 ? 'valore giornaliero' : 'valori giornalieri'}`,
    `${notes} ${notes === 1 ? 'nota' : 'note'}`,
    `${memos} ${memos === 1 ? 'nota libera' : 'note libere'}`,
    `${plan.projects.length} ${plan.projects.length === 1 ? 'progetto' : 'progetti'}`,
    `${projectNotes} ${projectNotes === 1 ? 'nota dei progetti' : 'note dei progetti'}`,
    `${assignments} ${assignments === 1 ? 'assegnazione' : 'assegnazioni'}`,
  ];
}

/** True without content: the lanes and the roadmap configuration alone do not count. */
export function isPlanEmpty(plan: PlanSnapshot): boolean {
  return (
    plan.tasks.length === 0 &&
    plan.metrics.length === 0 &&
    Object.keys(plan.dailyNotes).length === 0 &&
    plan.memos.length === 0 &&
    plan.projects.length === 0 &&
    plan.projectNotes.length === 0 &&
    plan.assignments.length === 0
  );
}

/** Fields of a task to overwrite; the ones left out stay as they are. */
export type TaskChanges = Partial<Omit<TaskItem, 'id'>>;

/** A daily value to set, or to remove with null. */
export interface MetricValueChange {
  date: string;
  value: number | null;
}

/**
 * The fields that differ between two versions of a task. Saving only these keeps the changes that
 * someone else made to the other fields in the meantime. Fields missing from `after` count as
 * unchanged.
 */
export function diffTask(before: TaskItem, after: TaskItem): TaskChanges {
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(after) as (keyof TaskItem)[]) {
    const value = after[key];
    if (key === 'id' || value === undefined) continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(value)) changes[key] = value;
  }
  return changes;
}

/** The content of a new task equal to this one, title included. */
export function copyOfTask({ id, ...content }: TaskItem): Omit<TaskItem, 'id'> {
  return content;
}

export function addTask(plan: PlanSnapshot, task: TaskItem): PlanSnapshot {
  return { ...plan, tasks: [...plan.tasks, task] };
}

/** Applies the changes to the task; a task that no longer exists stays deleted. */
export function updateTask(plan: PlanSnapshot, taskId: string, changes: TaskChanges): PlanSnapshot {
  return {
    ...plan,
    tasks: plan.tasks.map((task) => (task.id === taskId ? { ...task, ...changes } : task)),
  };
}

export function removeTask(plan: PlanSnapshot, taskId: string): PlanSnapshot {
  return { ...plan, tasks: plan.tasks.filter((task) => task.id !== taskId) };
}

/** Sets the note of a day; blank text removes it. */
export function setNote(plan: PlanSnapshot, date: string, text: string): PlanSnapshot {
  const dailyNotes = { ...plan.dailyNotes };
  if (text.trim()) dailyNotes[date] = text.trim();
  else delete dailyNotes[date];
  return { ...plan, dailyNotes };
}

/**
 * Moves the note of `from` to `to`, with a new text when one is given; without a note on `from`,
 * the text becomes a new note on `to`. A day has one note: when `to` already has one, nothing
 * changes.
 */
export function moveNote(
  plan: PlanSnapshot,
  from: string,
  to: string,
  text: string | undefined = plan.dailyNotes[from],
): PlanSnapshot {
  const moved = text?.trim();
  if (!moved || from === to || plan.dailyNotes[to] !== undefined) return plan;
  const { [from]: left, ...others } = plan.dailyNotes;
  return { ...plan, dailyNotes: { ...others, [to]: moved } };
}

function sortedMetrics(byDate: Map<string, DailyMetric>): DailyMetric[] {
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Sets or removes daily values. A day keeps its approval light and promotions. */
export function setMetricValues(
  plan: PlanSnapshot,
  changes: readonly MetricValueChange[],
): PlanSnapshot {
  const byDate = new Map(plan.metrics.map((metric) => [metric.date, metric]));
  for (const { date, value } of changes) {
    if (value === null) byDate.delete(date);
    else byDate.set(date, { ...byDate.get(date), date, value });
  }
  return { ...plan, metrics: sortedMetrics(byDate) };
}

/** Days of an imported forecast: each replaces what its day had, details included. */
export function importDailyValues(plan: PlanSnapshot, days: readonly DailyMetric[]): PlanSnapshot {
  const byDate = new Map(plan.metrics.map((metric) => [metric.date, metric]));
  for (const day of days) byDate.set(day.date, { ...day });
  return { ...plan, metrics: sortedMetrics(byDate) };
}

export function addMemo(plan: PlanSnapshot, memo: Memo): PlanSnapshot {
  return { ...plan, memos: sortMemos([...plan.memos, memo]) };
}

/** Applies the changes to the note; a note that no longer exists stays deleted. */
export function updateMemo(plan: PlanSnapshot, memoId: string, changes: MemoChanges): PlanSnapshot {
  return {
    ...plan,
    memos: sortMemos(
      plan.memos.map((memo) => (memo.id === memoId ? applyChanges<Memo>(memo, changes) : memo)),
    ),
  };
}

export function removeMemo(plan: PlanSnapshot, memoId: string): PlanSnapshot {
  return { ...plan, memos: plan.memos.filter((memo) => memo.id !== memoId) };
}

/** Moves a note right before `beforeId`, or to the end of the strip when it is null. */
export function moveMemo(
  plan: PlanSnapshot,
  memoId: string,
  beforeId: string | null,
): PlanSnapshot {
  const moves = memoMoves(plan.memos, memoId, beforeId);
  if (moves.size === 0) return plan;
  return {
    ...plan,
    memos: sortMemos(
      plan.memos.map((memo) => {
        const position = moves.get(memo.id);
        return position === undefined ? memo : { ...memo, position };
      }),
    ),
  };
}

export function addProject(plan: PlanSnapshot, project: Project): PlanSnapshot {
  return { ...plan, projects: sortProjects([...plan.projects, project]) };
}

/** Applies the changes to the project; a project that no longer exists stays deleted. */
export function updateProject(
  plan: PlanSnapshot,
  projectId: string,
  changes: ProjectChanges,
): PlanSnapshot {
  return {
    ...plan,
    projects: sortProjects(
      plan.projects.map((project) =>
        project.id === projectId ? applyChanges<Project>(project, changes) : project,
      ),
    ),
  };
}

/** Removes a project with its notes and assignments. */
export function removeProject(plan: PlanSnapshot, projectId: string): PlanSnapshot {
  return {
    ...plan,
    projects: plan.projects.filter((project) => project.id !== projectId),
    projectNotes: plan.projectNotes.filter((note) => note.projectId !== projectId),
    assignments: plan.assignments.filter((item) => item.projectId !== projectId),
  };
}

export function addProjectNote(plan: PlanSnapshot, note: ProjectNote): PlanSnapshot {
  return { ...plan, projectNotes: sortProjectNotes([...plan.projectNotes, note]) };
}

/** Applies the changes to the note; a note that no longer exists stays deleted. */
export function updateProjectNote(
  plan: PlanSnapshot,
  noteId: string,
  changes: ProjectNoteChanges,
): PlanSnapshot {
  return {
    ...plan,
    projectNotes: sortProjectNotes(
      plan.projectNotes.map((note) =>
        note.id === noteId ? applyChanges<ProjectNote>(note, changes) : note,
      ),
    ),
  };
}

export function removeProjectNote(plan: PlanSnapshot, noteId: string): PlanSnapshot {
  return { ...plan, projectNotes: plan.projectNotes.filter((note) => note.id !== noteId) };
}

export function addAssignment(plan: PlanSnapshot, assignment: Assignment): PlanSnapshot {
  return { ...plan, assignments: sortAssignments([...plan.assignments, assignment]) };
}

/** Applies the changes to the assignment; one that no longer exists stays deleted. */
export function updateAssignment(
  plan: PlanSnapshot,
  assignmentId: string,
  changes: AssignmentChanges,
): PlanSnapshot {
  return {
    ...plan,
    assignments: sortAssignments(
      plan.assignments.map((item) =>
        item.id === assignmentId ? applyChanges<Assignment>(item, changes) : item,
      ),
    ),
  };
}

export function removeAssignment(plan: PlanSnapshot, assignmentId: string): PlanSnapshot {
  return { ...plan, assignments: plan.assignments.filter((item) => item.id !== assignmentId) };
}

/** Puts an item in a list of the configuration, in place of the one with the same id. */
function upsert<T extends { id: string; position: number }>(items: readonly T[], item: T): T[] {
  return sortByPosition([...items.filter((other) => other.id !== item.id), item]);
}

/** Adds a custom field of the projects, or replaces the one with the same id. */
export function saveProjectField(plan: PlanSnapshot, field: ProjectField): PlanSnapshot {
  return { ...plan, roadmap: { ...plan.roadmap, fields: upsert(plan.roadmap.fields, field) } };
}

/** Removes a field; the values the projects hold for it stay, hidden, in case it comes back. */
export function removeProjectField(plan: PlanSnapshot, fieldId: string): PlanSnapshot {
  return {
    ...plan,
    roadmap: {
      ...plan.roadmap,
      fields: plan.roadmap.fields.filter((field) => field.id !== fieldId),
    },
  };
}

export function saveTeam(plan: PlanSnapshot, team: Team): PlanSnapshot {
  return { ...plan, roadmap: { ...plan.roadmap, teams: upsert(plan.roadmap.teams, team) } };
}

/** Removes a team; its stakeholders keep its id and show without a team. */
export function removeTeam(plan: PlanSnapshot, teamId: string): PlanSnapshot {
  return {
    ...plan,
    roadmap: { ...plan.roadmap, teams: plan.roadmap.teams.filter((team) => team.id !== teamId) },
  };
}

export function saveStakeholder(plan: PlanSnapshot, stakeholder: Stakeholder): PlanSnapshot {
  return {
    ...plan,
    roadmap: {
      ...plan.roadmap,
      stakeholders: upsert(plan.roadmap.stakeholders, stakeholder),
    },
  };
}

/** Removes a stakeholder with their assignments. */
export function removeStakeholder(plan: PlanSnapshot, stakeholderId: string): PlanSnapshot {
  return {
    ...plan,
    assignments: plan.assignments.filter((item) => item.stakeholderId !== stakeholderId),
    roadmap: {
      ...plan.roadmap,
      stakeholders: plan.roadmap.stakeholders.filter((item) => item.id !== stakeholderId),
    },
  };
}

/** Replaces the whole configuration of the roadmap, as when the defaults are loaded. */
export function replaceRoadmapConfig(plan: PlanSnapshot, roadmap: RoadmapConfig): PlanSnapshot {
  return { ...plan, roadmap };
}
