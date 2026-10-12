import type { TeamPlan } from '../../domain/teamPlan';
import type { AssignmentChanges, AssignmentContent } from '../../domain/assignments';
import type { ProjectNoteChanges, ProjectNoteContent } from '../../domain/projectNotes';
import type { ProjectChanges, ProjectContent } from '../../domain/projects';
import type { RoadmapSettingsChanges } from '../../domain/roadmapConfig';
import type { Project, ProjectField, RoadmapConfig, Stakeholder, Team } from '../../domain/types';
import type { MilestoneChanges, MilestoneContent } from '../../domain/milestones';

// What the roadmap can do to the plan, grouped by entity, so that the area and its windows take
// one object each instead of a dozen callbacks.

export interface ProjectActions {
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
}

export interface NoteActions {
  onCreate: (content: ProjectNoteContent) => void;
  onUpdate: (noteId: string, changes: ProjectNoteChanges) => void;
  onDelete: (noteId: string) => void;
}

export interface AssignmentActions {
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
