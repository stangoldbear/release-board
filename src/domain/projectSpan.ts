import { addDaysIso } from '../utils/dateUtils';
import { isWorkingDay, scheduleAssignment } from './assignments';
import type { WorkSchedule } from './assignments';
import type { DateRange } from './schedule';
import type { Assignment, Project, RoadmapConfig } from './types';

// Where a project falls on the calendar: its start, the furthest of its planned end, its own
// days of effort and the work of its team, and the days in between without any work.

/** A bar of the work of a project: the assignment of a person, or the contingency of the project. */
export interface WorkBar {
  kind: 'assignment' | 'contingency';
  /** The id of the assignment; for the contingency, the id of the project. */
  id: string;
  stakeholderId?: string;
  /** The day the work was set to start from; the schedule starts on the first working day. */
  startDate: string;
  manDays: number;
  schedule: WorkSchedule;
}

export interface ProjectSpan {
  /** The start of the project. */
  start: string;
  /** The furthest day of the project: planned end, own effort or the work of the team. */
  end: string;
  /** From the first to the last day worked by the bars; null without bars. */
  work: DateRange | null;
  /** Days within the work with no work at all, in runs that hold at least a working day. */
  gaps: DateRange[];
  /** Days of effort: the sum of the bars, or the project's own days when it has no bars. */
  totalManDays: number;
  /** The planned end, when one was given. */
  plannedEnd?: string;
  /** The end goes past the deadline. */
  late: boolean;
  bars: WorkBar[];
}

/** What the work of a project is scheduled on: the calendars of the people and of the company. */
export type WorkCalendar = Pick<RoadmapConfig, 'stakeholders' | 'closures'>;

/** The last day of an effort that starts on a day, on working days. */
export function endFromManDays(
  startDate: string,
  manDays: number,
  closures: readonly DateRange[],
): string {
  return scheduleAssignment({ startDate, manDays }, [], closures).end;
}

/** The bars of the work of a project: its assignments, then its contingency. */
export function workBarsOf(
  project: Pick<Project, 'id' | 'contingency'>,
  assignments: readonly Assignment[],
  { stakeholders, closures = [] }: WorkCalendar,
): WorkBar[] {
  const bars: WorkBar[] = assignments
    .filter((assignment) => assignment.projectId === project.id)
    .map((assignment) => ({
      kind: 'assignment',
      id: assignment.id,
      stakeholderId: assignment.stakeholderId,
      startDate: assignment.startDate,
      manDays: assignment.manDays,
      schedule: scheduleAssignment(
        assignment,
        stakeholders.find((item) => item.id === assignment.stakeholderId)?.absences ?? [],
        closures,
      ),
    }));
  if (project.contingency) {
    bars.push({
      kind: 'contingency',
      id: project.id,
      startDate: project.contingency.startDate,
      manDays: project.contingency.manDays,
      schedule: scheduleAssignment(project.contingency, [], closures),
    });
  }
  return bars;
}

/** The runs of days in the range that no bar works, each with at least a working day. */
function gapsWithin(
  range: DateRange,
  bars: readonly WorkBar[],
  closures: readonly DateRange[],
): DateRange[] {
  const worked = new Set(bars.flatMap((bar) => bar.schedule.workDays));
  const gaps: DateRange[] = [];
  let run: { start: string; end: string; working: boolean } | null = null;
  const close = () => {
    if (run?.working) gaps.push({ start: run.start, end: run.end });
    run = null;
  };
  for (let day = range.start; day <= range.end; day = addDaysIso(day, 1)) {
    if (worked.has(day)) {
      close();
      continue;
    }
    const working = isWorkingDay(day, closures);
    if (run) {
      run.end = day;
      run.working = run.working || working;
    } else {
      run = { start: day, end: day, working };
    }
  }
  close();
  return gaps;
}

/** Where a project falls on the calendar, from its data and the work of its team. */
export function projectSpan(
  project: Project,
  assignments: readonly Assignment[],
  calendar: WorkCalendar,
): ProjectSpan {
  const closures = calendar.closures ?? [];
  const bars = workBarsOf(project, assignments, calendar);
  const work =
    bars.length > 0
      ? {
          start: bars.map((bar) => bar.schedule.start).sort()[0] ?? project.startDate,
          end:
            bars
              .map((bar) => bar.schedule.end)
              .sort()
              .at(-1) ?? project.startDate,
        }
      : null;
  const ownEnd =
    bars.length === 0 && project.manDays
      ? endFromManDays(project.startDate, project.manDays, closures)
      : null;
  const end = [project.startDate, project.endDate, work?.end, ownEnd]
    .filter((day): day is string => typeof day === 'string')
    .sort()
    .at(-1) as string;
  const totalManDays =
    bars.length > 0 ? bars.reduce((sum, bar) => sum + bar.manDays, 0) : (project.manDays ?? 0);
  const span: ProjectSpan = {
    start: project.startDate,
    end,
    work,
    gaps: work ? gapsWithin(work, bars, closures) : [],
    totalManDays,
    late: project.deadline !== undefined && end > project.deadline,
    bars,
  };
  if (project.endDate) span.plannedEnd = project.endDate;
  return span;
}

/** The project with its effective end, as the roadmap and the search see it. */
export function withEffectiveEnd<T extends Project>(
  project: T,
  span: ProjectSpan,
): T & { endDate: string } {
  return { ...project, endDate: span.end };
}
