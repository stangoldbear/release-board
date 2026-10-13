import { useState } from 'react';
import type { ReactNode } from 'react';
import { assignmentsOfProject } from '../../domain/assignments';
import { DEFAULT_MILESTONE_COLOR_ID, diffMilestone } from '../../domain/milestones';
import { notesOfProject } from '../../domain/projectNotes';
import { customOrder } from '../../domain/projectOrder';
import { nextProjectColor } from '../../domain/projects';
import type { StatusChange } from '../../domain/projectStatus';
import type {
  Assignment,
  MemoAuthor,
  Milestone,
  PlanSnapshot,
  Project,
  Stakeholder,
} from '../../domain/types';
import { AssignmentDialog } from './AssignmentDialog';
import { MilestoneDialog } from './MilestoneDialog';
import { ProjectDialog } from './ProjectDialog';
import type { ProjectTab } from './ProjectDialog';
import type {
  AssignmentActions,
  MilestoneActions,
  NoteActions,
  ProjectActions,
  StakeholderActions,
} from './roadmapActions';
import { StakeholderDialog } from './StakeholderDialog';

/** Something to open, asked from outside the timeline, such as by an alert; the nonce tells a new ask. */
export interface OpenRequest {
  kind: 'project' | 'milestone';
  id: string;
  nonce: number;
}

interface RoadmapDialogsOptions {
  plan: PlanSnapshot;
  today: string;
  openRequest: OpenRequest | null;
  /** The published rules do not know the notes, the assignments and the configuration yet. */
  detailsUnavailable: boolean;
  /** In a shared instance, the signed-in member, and the full name of an author. */
  me: MemoAuthor | null;
  nameOf: (author: MemoAuthor) => string;
  projectActions: ProjectActions;
  noteActions: NoteActions;
  assignmentActions: AssignmentActions;
  stakeholderActions: StakeholderActions;
  milestoneActions: MilestoneActions;
}

export interface RoadmapDialogs {
  /** The window of a project; the change of state the dates ask for, if any, comes with it. */
  openProject: (project: Project & { statusChange?: StatusChange }, tab?: ProjectTab) => void;
  /** The window of a new project, from a day. */
  openNewProject: (from: string) => void;
  openAssignment: (assignment: Assignment) => void;
  addAssignment: (project: Project) => void;
  openStakeholder: (stakeholder: Stakeholder) => void;
  openMilestone: (milestone: Milestone) => void;
  /** The window of a new note on a day, of a project when one is given. */
  addMilestone: (date: string, projectId?: string) => void;
  /** The windows, mounted while open: render them once, in the area. */
  dialogs: ReactNode;
}

/** The window open on a project, or on a new one with its period. */
interface OpenProject {
  project: Project | null;
  /** The first day of a new project. */
  defaultStart: string;
  tab?: ProjectTab;
  /** The state the dates give the project, to propose. */
  statusChange?: StatusChange;
}

/** The windows of the roadmap: projects, assignments, people and notes on the timeline, and what opens them. */
export function useRoadmapDialogs({
  plan,
  today,
  openRequest,
  detailsUnavailable,
  me,
  nameOf,
  projectActions,
  noteActions,
  assignmentActions,
  stakeholderActions,
  milestoneActions,
}: RoadmapDialogsOptions): RoadmapDialogs {
  const [open, setOpen] = useState<OpenProject | null>(null);
  const [assignmentDialog, setAssignmentDialog] = useState<{
    assignment: Assignment | null;
    project: Project;
  } | null>(null);
  const [stakeholderDialog, setStakeholderDialog] = useState<Stakeholder | null>(null);
  const [milestoneDialog, setMilestoneDialog] = useState<{
    milestone: Milestone | null;
    date: string;
    projectId?: string;
  } | null>(null);

  // A new ask from outside, told by its nonce, opens the project while rendering: the state
  // follows the prop, as React has it done.
  const [handledRequest, setHandledRequest] = useState<number | null>(null);
  if (openRequest && openRequest.nonce !== handledRequest) {
    setHandledRequest(openRequest.nonce);
    if (openRequest.kind === 'project') {
      const asked = plan.projects.find((item) => item.id === openRequest.id);
      if (asked) setOpen({ project: asked, defaultStart: asked.startDate });
    } else {
      const asked = plan.milestones.find((item) => item.id === openRequest.id);
      if (asked) setMilestoneDialog({ milestone: asked, date: asked.date });
    }
  }
  const current = open?.project ? plan.projects.find((item) => item.id === open.project?.id) : null;

  const dialogs = (
    <>
      {open && (
        <ProjectDialog
          project={open.project}
          defaultStart={open.defaultStart}
          defaultColorId={nextProjectColor(plan.projects)}
          gone={open.project !== null && !current}
          config={plan.roadmap}
          notes={open.project ? notesOfProject(plan.projectNotes, open.project.id) : []}
          assignments={open.project ? assignmentsOfProject(plan.assignments, open.project.id) : []}
          detailsUnavailable={detailsUnavailable}
          me={me}
          nameOf={nameOf}
          today={today}
          statusChange={open.statusChange ?? null}
          initialTab={open.tab}
          onSubmit={(content) => {
            if (open.project) {
              projectActions.onSave(open.project, content);
              return open.project.id;
            }
            return projectActions.onCreate(content);
          }}
          onDelete={() => {
            if (open.project) projectActions.onDelete(open.project);
          }}
          onClose={() => setOpen(null)}
          noteActions={noteActions}
          onSaveTeam={projectActions.onSaveTeam}
          order={customOrder(plan.projects)}
          onReorder={projectActions.onReorder}
          onOpenAssignment={(assignment) => {
            if (current) setAssignmentDialog({ assignment, project: current });
          }}
        />
      )}

      {assignmentDialog && (
        <AssignmentDialog
          assignment={assignmentDialog.assignment}
          projectId={assignmentDialog.project.id}
          projectTitle={assignmentDialog.project.title}
          config={plan.roadmap}
          defaultStart={
            assignmentDialog.project.startDate > today ? assignmentDialog.project.startDate : today
          }
          onSave={(content) => {
            if (assignmentDialog.assignment) {
              assignmentActions.onUpdate(assignmentDialog.assignment.id, {
                stakeholderId: content.stakeholderId,
                startDate: content.startDate,
                manDays: content.manDays,
                note: content.note ?? null,
              });
            } else {
              assignmentActions.onCreate(content);
            }
          }}
          onDelete={() => {
            if (assignmentDialog.assignment) {
              assignmentActions.onDelete(assignmentDialog.assignment.id);
            }
          }}
          onClose={() => setAssignmentDialog(null)}
        />
      )}

      {milestoneDialog && (
        <MilestoneDialog
          milestone={milestoneDialog.milestone}
          date={milestoneDialog.date}
          projectId={milestoneDialog.projectId}
          projects={plan.projects}
          defaultColorId={DEFAULT_MILESTONE_COLOR_ID}
          onSubmit={(content) => {
            if (milestoneDialog.milestone) {
              milestoneActions.onUpdate(
                milestoneDialog.milestone.id,
                diffMilestone(milestoneDialog.milestone, content),
              );
            } else {
              milestoneActions.onCreate(content);
            }
          }}
          onDelete={() => {
            if (milestoneDialog.milestone) milestoneActions.onDelete(milestoneDialog.milestone.id);
          }}
          onClose={() => setMilestoneDialog(null)}
        />
      )}

      {stakeholderDialog && (
        <StakeholderDialog
          stakeholder={stakeholderDialog}
          config={plan.roadmap}
          onSave={stakeholderActions.onSave}
          onClose={() => setStakeholderDialog(null)}
        />
      )}
    </>
  );

  return {
    // The window edits the project as stored: the rows carry the effective end and state.
    openProject: (project, tab) => {
      const stored = plan.projects.find((item) => item.id === project.id) ?? project;
      setOpen({
        project: stored,
        defaultStart: stored.startDate,
        tab,
        ...(project.statusChange ? { statusChange: project.statusChange } : {}),
      });
    },
    openNewProject: (from) => setOpen({ project: null, defaultStart: from }),
    openAssignment: (assignment) => {
      const project = plan.projects.find((item) => item.id === assignment.projectId);
      if (project) setAssignmentDialog({ assignment, project });
    },
    addAssignment: (project) => setAssignmentDialog({ assignment: null, project }),
    openStakeholder: setStakeholderDialog,
    openMilestone: (milestone) => setMilestoneDialog({ milestone, date: milestone.date }),
    addMilestone: (date, projectId) =>
      setMilestoneDialog(
        projectId ? { milestone: null, date, projectId } : { milestone: null, date },
      ),
    dialogs,
  };
}
