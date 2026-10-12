import { useMemo, useState } from 'react';
import { ArrowRightFromLine, History, Plus } from 'lucide-react';
import { assignmentsOfProject } from '../../domain/assignments';
import { notesOfProject } from '../../domain/projectNotes';
import { PROJECT_STATUSES } from '../../domain/projects';
import type { ProjectWithEnd } from '../../domain/projects';
import { projectSpan, withEffectiveEnd } from '../../domain/projectSpan';
import type { ProjectSpan } from '../../domain/projectSpan';
import { ROADMAP_SORTS, ROADMAP_SORT_LABELS, customOrder } from '../../domain/projectOrder';
import type { RoadmapSort } from '../../domain/projectOrder';
import { nextProjectColor } from '../../domain/projects';
import { isGroupable, projectColorField } from '../../domain/roadmapConfig';
import type {
  Assignment,
  MemoAuthor,
  Milestone,
  PlanSnapshot,
  Project,
  ProjectField,
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
import { dayWidthOf } from '../calendar/calendarView';
import type { CalendarAction, CalendarView } from '../calendar/calendarView';
import { columnUnit } from '../calendar/timelineLayout';
import { AssignmentDialog } from './AssignmentDialog';
import { ProjectDialog } from './ProjectDialog';
import type { ProjectTab } from './ProjectDialog';
import { DETAIL_LEVELS, PROJECT_STATUS_ICONS, PROJECT_STATUS_PLURALS } from './projectUi';
import type { DetailLevel } from './projectUi';
import type {
  AssignmentActions,
  MilestoneActions,
  NoteActions,
  ProjectActions,
  StakeholderActions,
} from './roadmapActions';
import { roadmapRange } from './roadmapLayout';
import { RoadmapTimeline } from './RoadmapTimeline';
import { StakeholderDialog } from './StakeholderDialog';
import type { RoadmapDisplay, RoadmapDisplayControls } from './useRoadmapDisplay';
import { DEFAULT_MILESTONE_COLOR_ID, diffMilestone } from '../../domain/milestones';
import { MilestoneDialog } from './MilestoneDialog';

/** The button that adds a project, where the focus goes when one is deleted. */
export const NEW_PROJECT_ID = 'new-project';

interface RoadmapAreaProps {
  /** The element id of the area. */
  id: string;
  plan: PlanSnapshot;
  /** The projects to show, in the order of the roadmap: all of them, or those the search finds. */
  shown: Project[];
  /** Where each project falls: the work of its team, its days, its gaps. */
  spans: ReadonlyMap<string, ProjectSpan>;
  /** The notes on the timeline to show: all of them, or those the search finds. */
  milestones: Milestone[];
  milestoneActions: MilestoneActions;
  /** Something to open, asked from outside the area, such as by an alert; the nonce tells a new ask. */
  openRequest?: { kind: 'project' | 'milestone'; id: string; nonce: number } | null;
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
  /** The first day of a new project. */
  defaultStart: string;
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
 * A field to group by, among those that can. Without any, the menu stays, disabled, and says so:
 * the choice is there to be found, and its title says where to add a field.
 */
function FieldChoice({
  label,
  none,
  hint,
  fields,
  value,
  onChange,
}: {
  label: string;
  /** The choice of no field. */
  none: string;
  /** What kind of field it takes, shown while there is none. */
  hint: string;
  fields: ProjectField[];
  value: string;
  onChange: (fieldId: string) => void;
}) {
  const empty = fields.length === 0;
  return (
    <label
      className="flex items-center gap-2"
      title={empty ? `${hint}: Impostazioni → Roadmap → «Modifica i campi…»` : undefined}
    >
      <span className="text-xs font-bold tracking-wide uppercase">{label}</span>
      <select
        value={empty ? '' : value}
        disabled={empty}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:text-fg-muted"
      >
        <option value="">{empty ? 'Nessun campo adatto' : none}</option>
        {fields.map((field) => (
          <option key={field.id} value={field.id}>
            {field.label}
          </option>
        ))}
      </select>
    </label>
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
  spans,
  milestones,
  milestoneActions,
  openRequest = null,
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
  const [milestoneDialog, setMilestoneDialog] = useState<{
    milestone: Milestone | null;
    date: string;
    projectId?: string;
  } | null>(null);

  // The rows get the projects with their effective end.
  const endOf = (project: Project) =>
    spans.get(project.id) ?? projectSpan(project, plan.assignments, plan.roadmap.stakeholders);
  const allPlaced = useMemo(
    () => plan.projects.map((project) => withEffectiveEnd(project, endOf(project))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- endOf reads spans and the plan
    [plan.projects, spans],
  );
  const placed: ProjectWithEnd[] = useMemo(
    () => shown.map((project) => withEffectiveEnd(project, endOf(project))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- endOf reads spans and the plan
    [shown, spans],
  );
  const sortField = projectColorField(plan.roadmap);
  // The days held: those of the view, widened to every project; without the past, from today or
  // from the Monday of this week in weekly columns.
  const fullRange = useMemo(() => roadmapRange(view.range, allPlaced), [view.range, allPlaced]);
  const dayWidth = dayWidthOf(view);
  const firstShownDay = columnUnit(dayWidth) === 'week' ? startOfWeek(today) : today;
  const start =
    display.hidePastDays && firstShownDay > fullRange.start ? firstShownDay : fullRange.start;
  const range = useMemo(() => ({ start, end: fullRange.end }), [start, fullRange.end]);

  const openNew = (from: string) => setOpen({ project: null, defaultStart: from });
  // From today while this month is in view, otherwise from the first day in view.
  const openNewFromView = () =>
    openNew(startOfMonth(view.anchor) === startOfMonth(today) ? today : view.anchor);
  const openProject = (project: Project, tab?: ProjectTab) =>
    setOpen({ project, defaultStart: project.startDate, tab });
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
  // Each project shows what the roadmap shows, or what was chosen for it; the Team level needs
  // the published rules to know the assignments.
  const levelOf = (projectId: string): DetailLevel => {
    const own = display.projectLevels[projectId] ?? display.level;
    return detailsUnavailable && own === 'team' ? 'main' : own;
  };
  const exceptions = Object.keys(display.projectLevels).length;
  const groupable = plan.roadmap.fields.filter(isGroupable);
  const groupBy = groupable.find((field) => field.id === display.groupBy) ?? null;

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
            <Button id={NEW_PROJECT_ID} variant="primary" onClick={openNewFromView}>
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
            Trascina un progetto per spostarlo con il suo team, dai bordi per cambiarne inizio e
            fine pianificata; al livello Team trascina una persona per spostare l&apos;inizio del
            suo lavoro, dal bordo destro per i giorni uomo, doppio clic per scriverli. Maiusc +
            rotellina scorre i giorni, Ctrl + rotellina cambia lo zoom.
          </span>
          <span className="hidden pointer-coarse:inline">
            Tocca un progetto o una persona per modificarli. Scorri con un dito per vedere gli altri
            giorni, avvicina o allontana due dita per lo zoom.
          </span>
        </p>
        <RoadmapTimeline
          projects={placed}
          spans={spans}
          range={range}
          dayWidth={dayWidth}
          anchor={view.anchor}
          jump={view.jump}
          onScrolled={(first, last, settled) =>
            onViewAction({ type: 'scrolled', first, last, settled })
          }
          onResized={(viewport) => onViewAction({ type: 'resized', viewport })}
          today={today}
          highlightWeekends={display.highlightWeekends}
          level={detailsUnavailable && display.level === 'team' ? 'main' : display.level}
          levelOf={levelOf}
          teamLevelAvailable={!detailsUnavailable}
          rendering={display.barRendering}
          config={plan.roadmap}
          assignments={plan.assignments}
          searching={searching}
          textScale={textScale}
          compact={compact}
          oneLineTitles={display.oneLineTitles}
          groupBy={groupBy}
          onZoom={(step) => onViewAction({ type: 'zoomBy', step })}
          onShowDays={(date) => onViewAction({ type: 'goTo', date, zoom: 'detail' })}
          onOpen={(project) => openProject(project)}
          onAdd={openNewFromView}
          onAddAt={openNew}
          onChange={projectActions.onUpdate}
          onMove={projectActions.onMove}
          onOpenAssignment={(assignment) => {
            const project = plan.projects.find((item) => item.id === assignment.projectId);
            if (project) setAssignmentDialog({ assignment, project });
          }}
          onAddAssignment={(project) => setAssignmentDialog({ assignment: null, project })}
          onChangeAssignment={assignmentActions.onUpdate}
          onOpenStakeholder={setStakeholderDialog}
          onSetProjectLevel={displayControls.setProjectLevel}
          onReorder={projectActions.onReorder}
          milestones={milestones}
          projectTitleOf={(projectId) => plan.projects.find((item) => item.id === projectId)?.title}
          onOpenMilestone={(milestone) => setMilestoneDialog({ milestone, date: milestone.date })}
          onAddMilestone={(date, projectId) => {
            const target = projectId ? { projectId } : {};
            setMilestoneDialog({ milestone: null, date, ...target });
          }}
          onChangeMilestone={milestoneActions.onUpdate}
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
                const Icon = level.icon;
                return (
                  <button
                    key={level.id}
                    type="button"
                    title={
                      disabled
                        ? 'Servono le regole di sicurezza aggiornate per il livello Team'
                        : `${level.title}. I progetti con righe proprie tornano a seguire la roadmap`
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
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {level.label}
                  </button>
                );
              })}
            </div>
            {exceptions > 0 && (
              <span className="text-xs text-fg-muted">
                {exceptions === 1
                  ? '1 progetto con righe proprie'
                  : `${exceptions} progetti con righe proprie`}
              </span>
            )}
          </div>
          <label className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wide uppercase">Ordina per</span>
            <select
              value={display.sort}
              onChange={(event) => displayControls.setSort(event.target.value as RoadmapSort)}
              title="L'ordine delle righe; trascinando una riga si torna a «Personalizzato» partendo dall'ordine che si vede"
              className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs"
            >
              {ROADMAP_SORTS.map((sort) => (
                <option key={sort} value={sort} disabled={sort === 'field' && !sortField}>
                  {sort === 'field'
                    ? (sortField?.label ?? 'Campo con i colori')
                    : ROADMAP_SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </label>
          <FieldChoice
            label="Raggruppa per"
            none="Nessun gruppo"
            hint="Serve una lista di valori esclusivi con «Raggruppa»"
            fields={groupable}
            value={groupBy?.id ?? ''}
            onChange={(fieldId) => displayControls.setGroupBy(fieldId || null)}
          />
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
    </Area>
  );
}
