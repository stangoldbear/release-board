import type { AssignmentChanges, AssignmentContent } from '../domain/assignments';
import type { MemoChanges, MemoContent } from '../domain/memos';
import type { ProjectNoteChanges, ProjectNoteContent } from '../domain/projectNotes';
import type { ProjectChanges, ProjectContent } from '../domain/projects';
import type { MetricValueChange, TaskChanges } from '../domain/plan';
import type {
  DailyMetric,
  PlanSnapshot,
  ProjectField,
  RoadmapConfig,
  Stakeholder,
  TaskItem,
  Team,
} from '../domain/types';

/** Whether the changes made here have reached where the plan is kept. */
export type SyncStatus = 'synced' | 'saving' | 'offline' | 'error';

/**
 * Parts of the plan that came with rules of their own, which a published copy may lack: the
 * free notes (0.5), the projects (0.6), and their notes, assignments and configuration (0.7).
 */
export type PlanPart = 'memos' | 'projects' | 'roadmap';

/** The parts by name, for the sentence that says what the published rules refuse. */
export const PART_NAMES: Record<PlanPart, string> = {
  memos: 'Note libere',
  projects: 'Progetti',
  roadmap: 'Dettagli dei progetti',
};

/** "Note libere e progetti non disponibili: chi gestisce l'istanza deve pubblicare le regole…". */
export function unavailableMessage(parts: readonly PlanPart[]): string {
  const [first = '', ...others] = parts.map((part) => PART_NAMES[part]);
  const names = [first, ...others.map((part) => part.toLowerCase())];
  const list =
    names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1) ?? ''}` : first;
  return `${list} non disponibili: chi gestisce l'istanza deve pubblicare le regole di sicurezza aggiornate.`;
}

export interface SyncState {
  status: SyncStatus;
  /**
   * The last time this copy of the plan was confirmed by where the plan is kept: a change saved
   * there, or an update received from there. Null until the first time.
   */
  lastSyncedAt: Date | null;
  /** Why the status is "error", when it is. */
  error: string | null;
  /**
   * The parts of the plan that the published security rules do not let anyone read or write yet:
   * the plan goes on without them until the rules are published. A limit of the page, not an
   * error: the status says how the saving goes.
   */
  missing: readonly PlanPart[];
}

/** The state of a repository before it says otherwise. */
export const INITIAL_SYNC: SyncState = {
  status: 'synced',
  lastSyncedAt: null,
  error: null,
  missing: [],
};

/**
 * Where the plan lives. The app reads it only through `subscribe` and changes it one entity, or one
 * field, at a time: a shared backend can then merge the changes made by several people, and the
 * app never overwrites the whole plan with a stale copy.
 */
export interface PlanRepository {
  /**
   * Calls the listener with the current plan, synchronously when it is already available, and
   * again after every change, made here or elsewhere. Returns the function that stops the calls.
   */
  subscribe(listener: (plan: PlanSnapshot) => void): () => void;
  /** Calls the listener with the current synchronization state and after every change of it. */
  subscribeSync(listener: (state: SyncState) => void): () => void;
  /** Adds a new task with the given content and returns its id. */
  createTask(content: Omit<TaskItem, 'id'>): string;
  updateTask(taskId: string, changes: TaskChanges): void;
  deleteTask(taskId: string): void;
  /** Sets the note of a day; blank text removes it. */
  setNote(date: string, text: string): void;
  /**
   * Moves the note of `from` to `to`, with a new text when one is given. A day has one note: when
   * `to` already has one, nothing changes.
   */
  moveNote(from: string, to: string, text?: string): void;
  /** Sets or removes daily values; a day keeps its approval light and promotions. */
  setMetricValues(changes: readonly MetricValueChange[]): void;
  /** Saves the days of an imported forecast: each replaces what its day had, details included. */
  importDailyValues(days: readonly DailyMetric[]): void;
  /**
   * Adds a free note at the end of the strip and returns its id. In a shared instance its author
   * is the signed-in member, and a private note is seen by them alone.
   */
  createMemo(content: MemoContent): string;
  /**
   * Changes some fields of a free note, null removing an optional one, and puts it right before
   * `beforeId` when that is given (null: at the end of the strip), all in one change. Only its
   * author makes a note private or shared again, and the note then takes a new id. A note that the
   * plan delivered by `subscribe` does not have, yet or any more, is left alone. Returns the id of
   * the note after the change.
   */
  updateMemo(memoId: string, changes: MemoChanges, beforeId?: string | null): string;
  deleteMemo(memoId: string): void;
  /** Puts a free note right before another one, or at the end of the strip when `beforeId` is null. */
  moveMemo(memoId: string, beforeId: string | null): void;
  /** Adds a project to the roadmap and returns its id. */
  createProject(content: ProjectContent): string;
  /** Changes some fields of a project, null removing an optional one. */
  updateProject(projectId: string, changes: ProjectChanges): void;
  /** Removes a project with its notes and assignments. */
  deleteProject(projectId: string): void;
  /**
   * Adds a note to a project, written now, and returns its id. In a shared instance its author is
   * the signed-in member.
   */
  createProjectNote(content: ProjectNoteContent): string;
  /** Changes some fields of a note of a project, null removing an optional one. */
  updateProjectNote(noteId: string, changes: ProjectNoteChanges): void;
  deleteProjectNote(noteId: string): void;
  /** Adds the work of a person on a project and returns its id. */
  createAssignment(content: AssignmentContent): string;
  updateAssignment(assignmentId: string, changes: AssignmentChanges): void;
  deleteAssignment(assignmentId: string): void;
  /** Adds a custom field of the projects, or replaces the one with the same id. */
  saveProjectField(field: ProjectField): void;
  /** Removes a field; the values the projects hold for it stay, hidden. */
  deleteProjectField(fieldId: string): void;
  /** Adds a team, or replaces the one with the same id. */
  saveTeam(team: Team): void;
  deleteTeam(teamId: string): void;
  /** Adds a person of the team, or replaces the one with the same id. */
  saveStakeholder(stakeholder: Stakeholder): void;
  /** Removes a person with their assignments. */
  deleteStakeholder(stakeholderId: string): void;
  /** Replaces the whole configuration of the roadmap, as when the defaults are loaded. */
  replaceRoadmapConfig(config: RoadmapConfig): void;
  /** Replaces everything, as when a backup is restored. */
  replacePlan(plan: PlanSnapshot): void;
}
