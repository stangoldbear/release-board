import type { AssignmentChanges, AssignmentContent } from '../../domain/assignments';
import type { ProjectNoteChanges, ProjectNoteContent } from '../../domain/projectNotes';
import type { ProjectChanges, ProjectContent } from '../../domain/projects';
import type { Project, ProjectField, RoadmapConfig, Stakeholder, Team } from '../../domain/types';

// What the roadmap can do to the plan, grouped by entity, so that the area and its windows take
// one object each instead of a dozen callbacks.

export interface ProjectActions {
  onCreate: (content: ProjectContent) => void;
  onUpdate: (projectId: string, changes: ProjectChanges) => void;
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
export interface RoadmapConfigActions {
  onSaveField: (field: ProjectField) => void;
  onDeleteField: (fieldId: string) => void;
  onSaveTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  onSaveStakeholder: (stakeholder: Stakeholder) => void;
  onDeleteStakeholder: (stakeholderId: string) => void;
  /** Replaces the whole configuration, as when the defaults are loaded. */
  onReplaceConfig: (config: RoadmapConfig) => void;
}
