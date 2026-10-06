import { useMemo, useState } from 'react';
import { ArrowRightFromLine, Check, History, Plus } from 'lucide-react';
import { assignmentsOfProject } from '../../domain/assignments';
import { notesOfProject } from '../../domain/projectNotes';
import { PROJECT_STATUSES } from '../../domain/projects';
import { ZOOM_COLUMN_UNIT } from '../../domain/schedule';
import type {
  Assignment,
  MemoAuthor,
  PlanSnapshot,
  Project,
  Stakeholder,
} from '../../domain/types';
import { Area } from '../../shared/ui/Area';
import { Button } from '../../shared/ui/Button';
import { RulesNotice } from '../../shared/ui/RulesNotice';
import { SEGMENT, SEGMENTED, SEGMENT_OFF, SEGMENT_ON } from '../../shared/ui/segmented';
import type { TextScale } from '../../shared/ui/textScale';
import { ToggleChip } from '../../shared/ui/ToggleChip';
import { startOfMonth, startOfWeek } from '../../utils/dateUtils';
import { CalendarNav } from '../calendar/CalendarNav';
import type { CalendarAction, CalendarView } from '../calendar/calendarView';
import { AssignmentDialog } from './AssignmentDialog';
import { ProjectDialog } from './ProjectDialog';
import type { ProjectTab } from './ProjectDialog';
import { DETAIL_LEVELS, PROJECT_STATUS_ICONS, PROJECT_STATUS_PLURALS } from './projectUi';
import type {
  AssignmentActions,
  NoteActions,
  ProjectActions,
  StakeholderActions,
} from './roadmapActions';
import { newProjectPeriod, roadmapRange } from './roadmapLayout';
import { RoadmapTimeline } from './RoadmapTimeline';
import { StakeholderDialog } from './StakeholderDialog';
import type { RoadmapDisplay, RoadmapDisplayControls } from './useRoadmapDisplay';

/** The button that adds a project, where the focus goes when one is deleted. */
export const NEW_PROJECT_ID = 'new-project';

interface RoadmapAreaProps {
  /** The element id of the area. */
  id: string;
  plan: PlanSnapshot;
  /** The projects to show: all of them, or those the search finds. */
  shown: Project[];
  searching: boolean;
  /** The published security rules do not know projects yet: the area says so, and no more. */
  unavailable?: boolean;
  /** The published rules do not know the notes, the assignments and the configuration yet. */
  detailsUnavailable: boolean;
  view: CalendarView;
  onViewAction: (action: CalendarAction) => void;
  display: RoadmapDisplay;
  displayControls: RoadmapDisplayControls;
  today: string;
  textScale: TextScale;
  compact: boolean;
  /** In a shared instance, the signed-in member, and the full name of an author. */
  me: MemoAuthor | null;
  nameOf: (author: MemoAuthor) => string;
  projectActions: ProjectActions;
  noteActions: NoteActions;
  assignmentActions: AssignmentActions;
  stakeholderActions: StakeholderActions;
}

/** The window open on a project, or on a new one with its period. */
interface OpenProject {
  project: Project | null;
  period: { startDate: string; endDate: string };
  tab?: ProjectTab;
}

/** How many projects there are in each state, with its shape, and what the search finds. */
function ProjectSummary({ projects, found }: { projects: Project[]; found: number | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-2.5 text-xs">
      <ul aria-label="Progetti per stato" className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <li className="font-semibold">
          Progetti: <strong>{projects.length}</strong>
        </li>
        {PROJECT_STATUSES.map((status) => {
          const Icon = PROJECT_STATUS_ICONS[status];
          const count = projects.filter((project) => project.status === status).length;
          return (
            <li key={status} className="flex items-center gap-1.5 text-fg-muted">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {PROJECT_STATUS_PLURALS[status]}: <strong className="text-fg">{count}</strong>
            </li>
          );
        })}
      </ul>
      {/* Not announced: the bar of the search already says how many projects it finds. */}
      <p className="text-fg-muted">
        {found !== null && (
          <>
            Trovati <strong className="text-fg">{found}</strong> su {projects.length}
          </>
        )}
      </p>
    </div>
  );
}

/**
 * The roadmap of the projects, past, current and to come, over the same days as the calendar:
 * its period and views on the line of the title, then one card with the projects by state, the
 * rows and, under them, how much each row shows and the days to mark or hide.
 */
export function RoadmapArea({
  id,
  plan,
  shown,
  searching,
  unavailable = false,
  detailsUnavailable,
  view,
  onViewAction,
  display,
  displayControls,
  today,
  textScale,
  compact,
  me,
  nameOf,
  projectActions,
  noteActions,
  assignmentActions,
  stakeholderActions,
}: RoadmapAreaProps) {
  const [open, setOpen] = useState<OpenProject | null>(null);
  const [assignmentDialog, setAssignmentDialog] = useState<{
    assignment: Assignment | null;
    project: Project;
  } | null>(null);
  const [stakeholderDialog, setStakeholderDialog] = useState<Stakeholder | null>(null);

  // The days held: those of the view, widened to every project; without the past, from today or
  // from the Monday of this week in weekly columns.
  const fullRange = useMemo(
    () => roadmapRange(view.range, plan.projects),
    [view.range, plan.projects],
  );
  const firstShownDay = ZOOM_COLUMN_UNIT[view.zoom] === 'week' ? startOfWeek(today) : today;
  const start =
    display.hidePastDays && firstShownDay > fullRange.start ? firstShownDay : fullRange.start;
  const range = useMemo(() => ({ start, end: fullRange.end }), [start, fullRange.end]);

  const openNew = (from: string) => setOpen({ project: null, period: newProjectPeriod(from) });
  const openProject = (project: Project, tab?: ProjectTab) =>
    setOpen({ project, period: project, tab });
  const current = open?.project ? plan.projects.find((item) => item.id === open.project?.id) : null;

  if (unavailable) {
    return (
      <Area id={id} title="Roadmap">
        <RulesNotice what="I progetti" />
      </Area>
    );
  }

  return (
    <Area
      id={id}
      title="Roadmap"
      actions={
        <>
          <CalendarNav
            view={view}
            onViewAction={onViewAction}
            hidePastDays={display.hidePastDays}
            name="Periodo della roadmap"
            board={false}
          />
          <div className="ml-auto">
            <Button
              id={NEW_PROJECT_ID}
              variant="primary"
              onClick={() =>
                openNew(startOfMonth(view.anchor) === startOfMonth(today) ? today : view.anchor)
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuovo progetto
            </Button>
          </div>
        </>
      }
    >
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <ProjectSummary projects={plan.projects} found={searching ? shown.length : null} />
        <p className="bg-surface-muted px-4 py-1.5 text-xs text-fg-muted">
          <span className="pointer-coarse:hidden">
            Trascina un progetto per spostarlo, dai bordi per cambiarne inizio e fine; al livello
            Team trascina una persona per spostare l&apos;inizio del suo lavoro. Maiusc + rotellina
            scorre i giorni, Ctrl + rotellina cambia lo zoom.
          </span>
          <span className="hidden pointer-coarse:inline">
            Tocca un progetto o una persona per modificarli. Scorri con un dito per vedere gli altri
            giorni, avvicina o allontana due dita per lo zoom.
          </span>
        </p>
        <RoadmapTimeline
          projects={shown}
          range={range}
          zoom={view.zoom}
          anchor={view.anchor}
          jump={view.jump}
          onScrolled={(first, last, settled) =>
            onViewAction({ type: 'scrolled', first, last, settled })
          }
          today={today}
          highlightWeekends={display.highlightWeekends}
          level={detailsUnavailable && display.level === 'team' ? 'main' : display.level}
          config={plan.roadmap}
          assignments={plan.assignments}
          searching={searching}
          textScale={textScale}
          compact={compact}
          oneLineTitles={display.oneLineTitles}
          onZoom={(step) => onViewAction({ type: 'zoomBy', step })}
          onShowDays={(date) => onViewAction({ type: 'goTo', date, zoom: 'detail' })}
          onOpen={(project) => openProject(project)}
          onAddAt={openNew}
          onChange={projectActions.onUpdate}
          onOpenAssignment={(assignment) => {
            const project = plan.projects.find((item) => item.id === assignment.projectId);
            if (project) setAssignmentDialog({ assignment, project });
          }}
          onAddAssignment={(project) => setAssignmentDialog({ assignment: null, project })}
          onChangeAssignment={assignmentActions.onUpdate}
          onOpenStakeholder={setStakeholderDialog}
        />
        <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 bg-surface px-4 py-2.5 select-none">
          <div
            role="group"
            aria-labelledby={`${id}-level`}
            className="flex flex-wrap items-center gap-3"
          >
            <span id={`${id}-level`} className="text-xs font-bold tracking-wide uppercase">
              Informazioni visibili
            </span>
            <div className={SEGMENTED}>
              {DETAIL_LEVELS.map((level) => {
                const disabled = detailsUnavailable && level.id === 'team';
                const pressed = display.level === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    title={
                      disabled
                        ? 'Servono le regole di sicurezza aggiornate per il livello Team'
                        : level.title
                    }
                    aria-pressed={pressed}
                    aria-disabled={disabled || undefined}
                    onClick={() => {
                      if (!disabled) displayControls.setLevel(level.id);
                    }}
                    className={`${SEGMENT} ${pressed ? SEGMENT_ON : SEGMENT_OFF} ${
                      disabled ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  >
                    {pressed && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
                    {level.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ToggleChip
              pressed={display.highlightWeekends}
              onClick={displayControls.toggleWeekends}
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-holiday-fg" aria-hidden="true" />
              Festivi e weekend
            </ToggleChip>
            <ToggleChip pressed={display.hidePastDays} onClick={displayControls.togglePastDays}>
              <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Nascondi giorni passati
            </ToggleChip>
            <ToggleChip
              pressed={display.oneLineTitles}
              onClick={displayControls.toggleOneLineTitles}
              title="Titoli interi su una riga, anche oltre il rettangolo"
            >
              <ArrowRightFromLine className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Titoli su una riga
            </ToggleChip>
          </div>
        </div>
      </div>

      {open && (
        <ProjectDialog
          project={open.project}
          period={open.period}
          gone={open.project !== null && !current}
          config={plan.roadmap}
          notes={open.project ? notesOfProject(plan.projectNotes, open.project.id) : []}
          assignments={open.project ? assignmentsOfProject(plan.assignments, open.project.id) : []}
          detailsUnavailable={detailsUnavailable}
          me={me}
          nameOf={nameOf}
          today={today}
          initialTab={open.tab}
          onSave={(content) => {
            if (open.project) projectActions.onSave(open.project, content);
            else projectActions.onCreate(content);
          }}
          onDelete={() => {
            if (open.project) projectActions.onDelete(open.project);
          }}
          onClose={() => setOpen(null)}
          noteActions={noteActions}
          onOpenAssignment={(assignment) => {
            if (current) setAssignmentDialog({ assignment, project: current });
          }}
          onDeleteAssignment={(assignment) => assignmentActions.onDelete(assignment.id)}
          onOpenStakeholder={setStakeholderDialog}
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

      {stakeholderDialog && (
        <StakeholderDialog
          stakeholder={stakeholderDialog}
          config={plan.roadmap}
          onSave={stakeholderActions.onSave}
          onClose={() => setStakeholderDialog(null)}
        />
      )}
    </Area>
  );
}
