import type { TeamPlan } from '../../domain/teamPlan';
import type { AssignmentChanges, AssignmentContent } from '../../domain/assignments';
import type { ProjectNoteChanges, ProjectNoteContent } from '../../domain/projectNotes';
import type { ProjectChanges, ProjectContent } from '../../domain/projects';
import type { RoadmapSettingsChanges } from '../../domain/roadmapConfig';
import type { Project, ProjectField, RoadmapConfig, Stakeholder, Team } from '../../domain/types';
import type { MilestoneChanges, MilestoneContent } from '../../domain/milestones';
import type { SplitChoice } from '../split/SplitDialog';

// What the roadmap can do to the plan, grouped by entity, so that the area and its windows take
// one object each instead of a dozen callbacks.

export interface ProjectActions {
  onDuplicate: (project: Project) => void;
  /** Adds a copy of a block of the contingency of a project after it. */
  onDuplicateContingency: (projectId: string, segmentId: string) => void;
  /** Splits a block of the contingency of a project in parts, which take its place. */
  onSplitContingency: (projectId: string, segmentId: string, choice: SplitChoice) => void;
  /** Adds a project and returns its id, so that the work of its team can follow. */
  onCreate: (content: ProjectContent) => string;
  onUpdate: (projectId: string, changes: ProjectChanges) => void;
  /** Moves a project by some days with the work of its team; its deadline stays. */
  onMove: (projectId: string, days: number) => void;
  /** Brings the work of the team of a project to what its window planned. */
  onSaveTeam: (projectId: string, plan: TeamPlan) => void;
  /** Puts a project right before another in the order of the members, or last with null. */
  onReorder: (projectId: string, beforeId: string | null) => void;
  /** Saves what the window edited: only the fields that changed. */
  onSave: (project: Project, content: ProjectContent) => void;
  onDelete: (project: Project) => void;
  /** Adds a label to the plan, from the window of a project: its id, or null when it cannot be. */
  onCreateLabel: (name: string) => string | null;
}

export interface NoteActions {
  onCreate: (content: ProjectNoteContent) => void;
  onUpdate: (noteId: string, changes: ProjectNoteChanges) => void;
  onDelete: (noteId: string) => void;
}

export interface AssignmentActions {
  onDuplicate: (assignmentId: string) => void;
  /** Splits the work of a person in parts: the first stays the assignment, the others are new. */
  onSplit: (assignmentId: string, choice: SplitChoice) => void;
  onCreate: (content: AssignmentContent) => void;
  onUpdate: (assignmentId: string, changes: AssignmentChanges) => void;
  onDelete: (assignmentId: string) => void;
}

export interface StakeholderActions {
  onSave: (stakeholder: Stakeholder) => void;
}

/** What Settings → Roadmap can do to the configuration. */
/** What the roadmap does with the notes on the timeline. */
export interface MilestoneActions {
  onCreate: (content: MilestoneContent) => string;
  onUpdate: (milestoneId: string, changes: MilestoneChanges) => void;
  onDelete: (milestoneId: string) => void;
}

export interface RoadmapConfigActions {
  onSaveField: (field: ProjectField) => void;
  onDeleteField: (fieldId: string) => void;
  onSaveTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  onSaveStakeholder: (stakeholder: Stakeholder) => void;
  onDeleteStakeholder: (stakeholderId: string) => void;
  /** Replaces the whole configuration, as when the defaults are loaded. */
  onReplaceConfig: (config: RoadmapConfig) => void;
  /** Changes the shared settings, such as the formula of the contingency. */
  onSaveSettings: (changes: RoadmapSettingsChanges) => void;
}
