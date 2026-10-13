import { isWorkingDay } from '../../domain/assignments';
import type { ProjectSpan } from '../../domain/projectSpan';
import type { Project } from '../../domain/types';
import { addDaysIso } from '../../utils/dateUtils';
import type { WorkItem } from './barRendering';

/** How a project goes past its hard deadline: what the sign on the deadline tells. */
export interface DeadlineOverrun {
  deadline: string;
  /** The last day of the project, past the deadline. */
  end: string;
  /** Working days from the day after the deadline to the end. */
  workingDays: number;
  /** The bars of work that end past the deadline, in the order of the work. */
  late: WorkItem[];
}

/** The overrun of a project past its hard deadline; null when it has none, or no deadline. */
export function deadlineOverrun(
  project: Pick<Project, 'deadline'>,
  span: ProjectSpan,
  work: readonly WorkItem[],
): DeadlineOverrun | null {
  const { deadline } = project;
  if (!deadline || !span.late) return null;
  let workingDays = 0;
  for (let day = addDaysIso(deadline, 1); day <= span.end; day = addDaysIso(day, 1)) {
    if (isWorkingDay(day)) workingDays += 1;
  }
  return { deadline, end: span.end, workingDays, late: work.filter((item) => item.late) };
}
