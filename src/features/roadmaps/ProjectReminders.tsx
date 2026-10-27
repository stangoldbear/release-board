import { CalendarClock, FolderOpen } from 'lucide-react';
import type { SeenReminders } from '../../domain/memos';
import { dueProjects } from '../../domain/projectReminders';
import type { DueProject } from '../../domain/projectReminders';
import type { Milestone, Project } from '../../domain/types';
import { useFormatDate } from '../../shared/dateFormat';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { useOpenDialogCount } from '../../shared/ui/openDialogs';
import { useNow } from '../../shared/useNow';
import { diffDays, formatDateToISO } from '../../utils/dateUtils';
import { ProjectStatusMark } from './projectUi';
import { dueMilestones } from '../../domain/milestones';
import { taskColorStyle } from '../../themes';
import { Markdown } from '../../shared/ui/Markdown';

/** How often the day is checked, so that a page left open shows the alerts of a new day. */
const CHECK_MS = 60_000;

interface ProjectRemindersProps {
  projects: Project[];
  /** The notes on the timeline, those with an alert coming on their day. */
  milestones: Milestone[];
  seenMilestones: SeenReminders;
  onSeenMilestones: (shown: Milestone[]) => void;
  onOpenMilestone: (milestoneId: string) => void;
  /** The end of the work of a project, the day of the alert without a deadline. */
  endOf: (project: Project) => string;
  /** The alerts this browser has already shown. */
  seen: SeenReminders;
  /** The alerts shown, to remember when they are dismissed. */
  onSeen: (shown: DueProject[]) => void;
  /** Opens the window of a project. */
  onOpen: (projectId: string) => void;
}

/** "fra 7 giorni", "oggi", "superata da 2 giorni": how far the day is. */
function distance(date: string, today: string, deadline: boolean): string {
  const days = diffDays(today, date);
  if (days === 0) return 'oggi';
  if (days > 0) return `fra ${days} ${days === 1 ? 'giorno' : 'giorni'}`;
  return `${deadline ? 'superata' : 'passata'} da ${-days} ${days === -1 ? 'giorno' : 'giorni'}`;
}

/**
 * The projects whose alert has come, in a window: the deadline, or the end of the work, and
 * how far it is; «Apri il progetto» opens one, «Chiudi» dismisses the alerts for their day in
 * this browser. The window waits for the ones the user opened to close.
 */
export function ProjectReminders({
  projects,
  milestones,
  seenMilestones,
  onSeenMilestones,
  onOpenMilestone,
  endOf,
  seen,
  onSeen,
  onOpen,
}: ProjectRemindersProps) {
  const formatDate = useFormatDate();
  const today = formatDateToISO(useNow(CHECK_MS));
  const openDialogs = useOpenDialogCount();
  const due = dueProjects(projects, endOf, today, seen);
  const dueNotes = dueMilestones(milestones, today, seenMilestones);
  const count = due.length + dueNotes.length;
  if (openDialogs > 0 || count === 0) return null;

  const dismiss = () => {
    if (due.length > 0) onSeen(due);
    if (dueNotes.length > 0) onSeenMilestones(dueNotes);
  };
  const title =
    due.length === 0
      ? dueNotes.length === 1
        ? 'Nota sulla timeline di oggi'
        : `${dueNotes.length} note sulla timeline`
      : count === 1
        ? 'Scadenza di un progetto'
        : `${count} scadenze dei progetti`;

  return (
    <Dialog
      title={title}
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
          <CalendarClock className="h-5 w-5" aria-hidden="true" />
        </div>
      }
      unprompted
      onClose={dismiss}
      className="max-w-md"
      footer={
        <Button variant="primary" onClick={dismiss} data-autofocus>
          Chiudi
        </Button>
      }
    >
      <ul className="space-y-2">
        {dueNotes.map((milestone) => (
          <li
            key={milestone.id}
            className="rounded-lg border border-warning bg-warning-soft p-3 text-sm"
          >
            <p className="flex items-center gap-2 font-bold">
              <span
                aria-hidden="true"
                style={taskColorStyle(milestone.colorId)}
                className="block h-3 w-3 shrink-0 rotate-45 rounded-[2px] border-2"
              />
              <span className="min-w-0 truncate">{milestone.title}</span>
            </p>
            <p className="mt-1 text-xs">
              <span className="font-semibold">
                Nota sulla timeline del {formatDate(milestone.date)}
              </span>
              {milestone.projectId &&
                `, ${projects.find((item) => item.id === milestone.projectId)?.title ?? 'progetto'}`}
              {milestone.body && (
                <Markdown text={milestone.body} phrasing className="mt-1 text-fg" />
              )}
            </p>
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  dismiss();
                  onOpenMilestone(milestone.id);
                }}
                aria-label={`Apri la nota «${milestone.title}»`}
              >
                <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Apri la nota
              </Button>
            </div>
          </li>
        ))}
        {due.map(({ project, date, deadline }) => (
          <li
            key={project.id}
            className="rounded-lg border border-warning bg-warning-soft p-3 text-sm"
          >
            <p className="flex items-center gap-2 font-bold">
              <ProjectStatusMark status={project.status} iconOnly />
              <span className="min-w-0 truncate">{project.title}</span>
            </p>
            <p className="mt-1 text-xs">
              <span className="font-semibold">
                {deadline ? 'Deadline' : 'Fine del progetto'} il {formatDate(date)}
              </span>
              , {distance(date, today, deadline)}
            </p>
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  dismiss();
                  onOpen(project.id);
                }}
                aria-label={`Apri il progetto «${project.title}»`}
              >
                <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Apri il progetto
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
