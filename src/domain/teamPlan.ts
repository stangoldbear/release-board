import { arrangeProject } from './arrangement';
import type { BarToPlace } from './arrangement';
import type { AssignmentChanges, AssignmentContent } from './assignments';
import type { Assignment, Project, ProjectContingency, RoadmapConfig } from './types';

// What the table of the days of a project asks of the plan: the assignments to add, change and
// remove, and the contingency, with every bar placed by the arrangement of the project.

/** A row of the table: a person and their days; `assignmentId` when the row is an assignment already. */
export interface TeamRow {
  assignmentId?: string;
  stakeholderId: string;
  manDays: number;
}

export interface TeamPlan {
  create: AssignmentContent[];
  update: { id: string; changes: AssignmentChanges }[];
  remove: string[];
  /** The contingency of the project after the save; null for none. */
  contingency: ProjectContingency | null;
}

/**
 * The changes that bring the assignments of a project to the rows of its table, each bar placed
 * by the arrangement: a new row is an assignment to add, a row with other days one to change, an
 * assignment without a row one to remove. The manual arrangement keeps every bar where it is and
 * puts a new one at the start of the project.
 */
export function planTeam(
  project: Pick<Project, 'id' | 'startDate' | 'arrangement' | 'contingency'>,
  existing: readonly Assignment[],
  rows: readonly TeamRow[],
  contingencyDays: number | null,
  config: RoadmapConfig,
): TeamPlan {
  const kept = rows.filter((row) => row.manDays > 0);
  const bars: BarToPlace[] = kept.map((row, index) => {
    const current = existing.find((item) => item.id === row.assignmentId);
    return {
      id: row.assignmentId ?? `new-${index}`,
      stakeholderId: row.stakeholderId,
      manDays: row.manDays,
      startDate: current?.startDate ?? project.startDate,
    };
  });
  const arranged = arrangeProject(project, bars, contingencyDays, config);

  const plan: TeamPlan = { create: [], update: [], remove: [], contingency: null };
  bars.forEach((bar) => {
    const startDate = arranged.starts[bar.id] ?? bar.startDate;
    const current = existing.find((item) => item.id === bar.id);
    if (!current) {
      plan.create.push({
        projectId: project.id,
        stakeholderId: bar.stakeholderId,
        startDate,
        manDays: bar.manDays,
      });
      return;
    }
    const changes: AssignmentChanges = {};
    if (current.manDays !== bar.manDays) changes.manDays = bar.manDays;
    if (current.startDate !== startDate) changes.startDate = startDate;
    if (current.stakeholderId !== bar.stakeholderId) changes.stakeholderId = bar.stakeholderId;
    if (Object.keys(changes).length > 0) plan.update.push({ id: current.id, changes });
  });
  for (const item of existing) {
    if (!kept.some((row) => row.assignmentId === item.id)) plan.remove.push(item.id);
  }
  if (contingencyDays && arranged.contingencyStart) {
    plan.contingency = {
      ...project.contingency,
      startDate:
        project.arrangement === 'manual' && project.contingency
          ? project.contingency.startDate
          : arranged.contingencyStart,
      manDays: contingencyDays,
    };
  }
  return plan;
}
