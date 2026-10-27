import { useId, useMemo } from 'react';
import {
  ArrowUpDown,
  Banknote,
  BriefcaseBusiness,
  CalendarOff,
  CalendarRange,
  CircleHelp,
  Diamond,
  EyeOff,
  Group,
  History,
  Milestone as MilestoneIcon,
  Pencil,
  Plus,
  RotateCcw,
  Rows3,
  StickyNote,
  Tag,
  TriangleAlert,
  Upload,
  UsersRound,
} from 'lucide-react';
import { areaElementId } from '../../app/areas';
import {
  NO_LABELS_FILTER,
  activeLabelsFilter,
  describeLabelsFilter,
  isFilteringLabels,
  labelsOf,
} from '../../domain/labels';
import { freeMilestones } from '../../domain/milestones';
import { DAILY_METRIC, TASK_STATUSES, TASK_STATUS_LABELS } from '../../domain/plan';
import type { TaskChanges } from '../../domain/plan';
import { ROADMAP_SORTS, ROADMAP_SORT_LABELS } from '../../domain/projectOrder';
import { PROJECT_STATUSES } from '../../domain/projects';
import type { ProjectWithEnd } from '../../domain/projects';
import type { ProjectSpan } from '../../domain/projectSpan';
import type { ProjectOfDay } from '../../domain/projectStatus';
import { dayNotesColorOf, isGroupable, projectColorField } from '../../domain/roadmapConfig';
import { isInRange, weekRange } from '../../domain/schedule';
import { countByStatus } from '../../domain/stats';
import type { TaskColorId } from '../../domain/colors';
import type { TimelineNotesLook } from '../../domain/timelineNotes';
import type {
  Closure,
  Memo,
  MemoAuthor,
  Milestone,
  PlanSnapshot,
  TaskItem,
  TaskStatus,
} from '../../domain/types';
import { Area } from '../../shared/ui/Area';
import { Button } from '../../shared/ui/Button';
import { Menu } from '../../shared/ui/Menu';
import type { MenuItem } from '../../shared/ui/Menu';
import { Popover } from '../../shared/ui/Popover';
import { RulesNotice } from '../../shared/ui/RulesNotice';
import { SEGMENT, SEGMENTED, SEGMENT_OFF, SEGMENT_ON } from '../../shared/ui/segmented';
import type { TextScale } from '../../shared/ui/textScale';
import { isTight } from '../../shared/ui/density';
import type { Density } from '../../shared/ui/density';
import { ToggleChip } from '../../shared/ui/ToggleChip';
import { Tooltip } from '../../shared/ui/Tooltip';
import { startOfMonth, startOfWeek } from '../../utils/dateUtils';
import { CalendarNav } from '../calendar/CalendarNav';
import { dayWidthOf } from '../calendar/calendarView';
import type { CalendarAction, CalendarView } from '../calendar/calendarView';
import { LanesSection } from '../calendar/LanesSection';
import { NotesSection } from '../calendar/NotesSection';
import { columnUnit, timelineMetrics } from '../calendar/timelineLayout';
import { WeekBoard } from '../calendar/WeekBoard';
import { PeopleSection } from '../people/PeopleSection';
import { usePeopleWork } from '../people/usePeopleWork';
import { ProjectsSection } from '../roadmaps/ProjectsSection';
import { DETAIL_LEVELS, PROJECT_STATUS_ICONS, PROJECT_STATUS_PLURALS } from '../roadmaps/projectUi';
import type { DetailLevel } from '../roadmaps/projectUi';
import type {
  AssignmentActions,
  MilestoneActions,
  NoteActions,
  ProjectActions,
  StakeholderActions,
} from '../roadmaps/roadmapActions';
import { roadmapMetrics, roadmapRange } from '../roadmaps/roadmapLayout';
import { ColorSwatch } from '../settings/ColorMenu';
import { useMilestoneTools } from '../roadmaps/useMilestoneTools';
import { useRoadmapDialogs } from '../roadmaps/useRoadmapDialogs';
import type { OpenRequest } from '../roadmaps/useRoadmapDialogs';
import { TASK_STATUS_ICONS, TASK_STATUS_PLURALS } from '../tasks/taskUi';
import { HelpPanel } from './HelpPanel';
import { SectionHeader } from './SectionHeader';
import { TimelineFrame } from './TimelineFrame';
import { TimelineNotesRow } from './TimelineNotesRow';
import { LABEL_WIDTH, TIMELINE_PARTS, oneLineTitlesOf } from './useTimelineDisplay';
import type { TimelineDisplay, TimelineDisplayControls, TimelinePart } from './useTimelineDisplay';

/** No company closures: one list, so that the columns of the days are not built again. */
const NO_CLOSURES: readonly Closure[] = [];

/** The least height of a line of the notes with a day, when each kind has its own. */
const NOTE_LANE_MIN = 22;

/** The button that adds things, where the focus goes when a task or a project is deleted. */
export const NEW_ITEM_ID = 'new-item';

/** The element id of the area; its parts keep the ids of the areas they were. */
export const TIMELINE_AREA_ID = 'area-timeline';

/** What the lanes of the releases need: the tasks the search and the status keep, and the actions. */
export interface ReleasesProps {
  tasks: TaskItem[];
  /** The days whose note the search finds; null while nothing is searched. */
  noteMatches: Set<string> | null;
  status: TaskStatus | null;
  onStatusChange: (status: TaskStatus | null) => void;
  onOpenTask: (task: TaskItem) => void;
  onChangeTask: (taskId: string, changes: TaskChanges) => void;
  onDuplicateTask: (task: TaskItem) => void;
  /** Opens the window that splits a task in parts. */
  onSplitTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskAt: (date: string, laneId: string) => void;
  /** Puts a lane right before another one, or last when `beforeId` is null. */
  onMoveLane: (laneId: string, beforeId: string | null) => void;
  onSaveNote: (date: string, text: string) => void;
  /** Moves the note of a day to another day, with a new text when one is given. */
  onMoveNote: (from: string, to: string, text?: string) => void;
  onEditMetrics: () => void;
  onImportMetrics: () => void;
}

/** What the projects of the roadmap need: the projects as the day has them, and the actions. */
export interface RoadmapProps {
  /** Every project, with its effective end and the state of the day. */
  projects: ProjectOfDay<ProjectWithEnd>[];
  /** The projects to show, in the order of the rows: all of them, or those the search finds. */
  shown: ProjectOfDay<ProjectWithEnd>[];
  spans: ReadonlyMap<string, ProjectSpan>;
  /** The notes on the timeline to show: all of them, or those the search finds. */
  milestones: Milestone[];
  milestoneActions: MilestoneActions;
  openRequest: OpenRequest | null;
  /** The published security rules do not know projects yet: the part says so, and no more. */
  unavailable: boolean;
  /** The published rules do not know the notes, the assignments and the configuration yet. */
  detailsUnavailable: boolean;
  me: MemoAuthor | null;
  nameOf: (author: MemoAuthor) => string;
  projectActions: ProjectActions;
  noteActions: NoteActions;
  assignmentActions: AssignmentActions;
  stakeholderActions: StakeholderActions;
}

interface TimelineAreaProps {
  /** Which parts the page shows: the tab open, or the buttons of the header. */
  parts: Record<TimelinePart, boolean>;
  plan: PlanSnapshot;
  view: CalendarView;
  onViewAction: (action: CalendarAction) => void;
  display: TimelineDisplay;
  controls: TimelineDisplayControls;
  today: string;
  textScale: TextScale;
  /** How close together the rows are: tight lines, and at «Compatta» thin bars of the people. */
  density: Density;
  /** The day chosen in the row of the days, whose effort the footer shows; null for none. */
  selectedDay: string | null;
  onSelectDay: (date: string | null) => void;
  searching: boolean;
  releases: ReleasesProps;
  roadmap: RoadmapProps;
  timelineNotes: TimelineNotesProps;
}

/** What the row «Note sulla timeline» gathers beyond the plan, how it looks, and what it opens. */
export interface TimelineNotesProps {
  look: TimelineNotesLook;
  /** The free notes the user sees, as the search keeps them. */
  memos: readonly Memo[];
  /** The color of the free notes without one, as Notes shows them. */
  paperColor: TaskColorId | undefined;
  onOpenDayNote: (date: string) => void;
  onOpenMemo: (memo: Memo) => void;
}

const PART_TITLES: Record<TimelinePart, string> = {
  releases: 'Next Releases',
  roadmaps: 'Roadmap',
  people: 'Persone',
};

const PART_ICONS = {
  releases: CalendarRange,
  roadmaps: MilestoneIcon,
  people: UsersRound,
} as const;

/** How much every row shows: three icons, one pressed, each with its name on the tip. */
function LevelToggle({
  level,
  teamAvailable,
  onChange,
}: {
  level: DetailLevel;
  teamAvailable: boolean;
  onChange: (level: DetailLevel) => void;
}) {
  return (
    <div role="group" aria-label="Informazioni visibili" className={SEGMENTED}>
      {DETAIL_LEVELS.map((option) => {
        const Icon = option.icon;
        const pressed = level === option.id;
        const disabled = option.id === 'team' && !teamAvailable;
        return (
          <Tooltip
            key={option.id}
            text={
              disabled
                ? 'Servono le regole di sicurezza aggiornate per il livello Team'
                : `${option.label}: ${option.title.toLowerCase()}`
            }
          >
            <button
              type="button"
              aria-pressed={pressed}
              aria-disabled={disabled || undefined}
              aria-label={option.label}
              onClick={() => {
                if (!disabled) onChange(option.id);
              }}
              className={`${SEGMENT} px-2 ${pressed ? SEGMENT_ON : SEGMENT_OFF} ${
                disabled ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

/**
 * The timeline of the releases and of the projects over the same days: one period, one zoom, one
 * level of detail, one column of names. Under the title, the period and the views, the revenue
 * and the «Nuovo» menu; in the card, the rows to show, the level, the order and the groups of the
 * projects, then the frame with the notes, the lanes of the releases and the projects, each part
 * under a header with its counts that also folds it. The board of one week takes the place of the
 * frame when that view is chosen.
 */
export function TimelineArea({
  parts,
  plan,
  view,
  onViewAction,
  display,
  controls,
  today,
  textScale,
  density,
  selectedDay,
  onSelectDay,
  searching,
  releases,
  roadmap,
  timelineNotes,
}: TimelineAreaProps) {
  const shownParts = TIMELINE_PARTS.filter((part) => parts[part]);
  const several = shownParts.length > 1;
  const title = several ? 'Timeline' : PART_TITLES[shownParts[0] ?? 'roadmaps'];
  // The projects and the people share the days the work of the projects needs.
  const projectDays = parts.roadmaps || parts.people;
  const releasesRowsId = useId();
  const roadmapRowsId = useId();
  const peopleRowsId = useId();
  const oneLineTitles = oneLineTitlesOf(display, view.zoom);
  const dayWidth = dayWidthOf(view);
  const compact = isTight(density);
  const sizes = timelineMetrics(dayWidth, textScale, compact, oneLineTitles);
  const level =
    roadmap.detailsUnavailable && display.level === 'team' ? ('main' as const) : display.level;
  const metrics = roadmapMetrics(dayWidth, textScale, density);
  // One column of names for the whole timeline, as wide as the user made it, with the text; on
  // phones at most two fifths of the screen.
  const labelWidthPx = Math.round(display.labelWidth * textScale);
  const labelWidth = `min(${labelWidthPx}px, 40vw)`;

  // The days held: those of the view, widened to every project shown; without the past, from
  // today or from the Monday of this week in weekly columns.
  const projects = roadmap.projects;
  const fullRange = useMemo(
    () => (projectDays ? roadmapRange(view.range, projects) : view.range),
    [projectDays, view.range, projects],
  );
  const firstShownDay = columnUnit(dayWidth) === 'week' ? startOfWeek(today) : today;
  const start =
    display.hidePastDays && firstShownDay > fullRange.start ? firstShownDay : fullRange.start;
  const range = useMemo(() => ({ start, end: fullRange.end }), [start, fullRange.end]);
  const week = weekRange(view.anchor);
  // A new item starts today when today is in view, otherwise on the first day in view.
  const defaultDay =
    view.mode === 'week'
      ? isInRange(today, week)
        ? today
        : week.start
      : startOfMonth(view.anchor) === startOfMonth(today)
        ? today
        : view.anchor;

  // The labels: the projects with one of those chosen, or with all of them, or without labels.
  const labels = labelsOf(plan.roadmap);
  const labelsFilter = activeLabelsFilter(display.labelsFilter, labels);
  const filteringLabels = isFilteringLabels(labelsFilter);

  const dialogs = useRoadmapDialogs({
    plan,
    today,
    openRequest: roadmap.openRequest,
    detailsUnavailable: roadmap.detailsUnavailable,
    me: roadmap.me,
    nameOf: roadmap.nameOf,
    projectActions: roadmap.projectActions,
    noteActions: roadmap.noteActions,
    assignmentActions: roadmap.assignmentActions,
    stakeholderActions: roadmap.stakeholderActions,
    milestoneActions: roadmap.milestoneActions,
    newProjectLabelIds: labelsFilter.ids,
  });
  const peopleWork = usePeopleWork(
    roadmap.projects,
    roadmap.shown,
    roadmap.spans,
    plan.roadmap,
    today,
  );
  const milestone = useMilestoneTools({
    dayWidth,
    onOpen: dialogs.openMilestone,
    onChange: roadmap.milestoneActions.onUpdate,
    projectTitleOf: (projectId) => plan.projects.find((item) => item.id === projectId)?.title,
  });

  // Each project shows what the timeline shows, or what was chosen for it; the Team level needs
  // the published rules to know the assignments.
  const levelOf = (projectId: string): DetailLevel => {
    const own = display.projectLevels[projectId] ?? display.level;
    return roadmap.detailsUnavailable && own === 'team' ? 'main' : own;
  };
  const exceptions = Object.keys(display.projectLevels).length;
  const groupable = plan.roadmap.fields.filter(isGroupable);
  const closures = plan.roadmap.closures ?? NO_CLOSURES;
  const groupBy = groupable.find((field) => field.id === display.groupBy) ?? null;
  const sortField = projectColorField(plan.roadmap);
  const visibleLanes = plan.lanes.filter(
    (lane) => !display.visibility.hiddenLaneIds.includes(lane.id),
  );
  const noLaneShown = visibleLanes.length === 0;
  // The row of the notes with a day shows what the search finds, as every part does.
  const noteMatches = releases.noteMatches;
  const dayNotes = useMemo(
    () =>
      noteMatches
        ? Object.fromEntries(
            Object.entries(plan.dailyNotes).filter(([date]) => noteMatches.has(date)),
          )
        : plan.dailyNotes,
    [plan.dailyNotes, noteMatches],
  );
  const freeShown = useMemo(
    () => (roadmap.unavailable ? [] : freeMilestones(roadmap.milestones)),
    [roadmap.unavailable, roadmap.milestones],
  );

  // The menus of the bar.
  const newItems: MenuItem[] = [];
  if (parts.releases) {
    newItems.push({
      label: 'Attività',
      icon: CalendarRange,
      onSelect: () => releases.onAddTaskAt(defaultDay, plan.lanes[0]?.id ?? ''),
    });
  }
  if (projectDays && !roadmap.unavailable) {
    newItems.push({
      label: 'Progetto',
      icon: MilestoneIcon,
      onSelect: () => dialogs.openNewProject(defaultDay),
    });
    newItems.push({
      label: 'Nota sulla timeline',
      icon: Diamond,
      onSelect: () => dialogs.addMilestone(defaultDay),
    });
  }
  const metricsItems: MenuItem[] = [
    { label: 'Modifica…', icon: Pencil, onSelect: releases.onEditMetrics },
    { label: 'Importa…', icon: Upload, onSelect: releases.onImportMetrics },
    { kind: 'separator' },
    {
      kind: 'check',
      label: 'Mostra la riga',
      checked: display.showMetrics,
      onToggle: controls.toggleMetrics,
    },
  ];
  const rowItems: MenuItem[] = [
    {
      kind: 'check',
      label: DAILY_METRIC.label,
      icon: Banknote,
      checked: display.showMetrics,
      onToggle: controls.toggleMetrics,
    },
  ];
  rowItems.push({
    kind: 'check',
    label: 'Note sulla timeline',
    icon: Diamond,
    checked: display.showFreeNotes,
    onToggle: controls.toggleFreeNotes,
  });
  if (parts.releases) {
    rowItems.push({
      kind: 'check',
      label: 'Note dei giorni',
      icon: StickyNote,
      checked: display.visibility.showNotes,
      onToggle: controls.toggleNotes,
    });
    rowItems.push({ kind: 'separator' }, { kind: 'heading', label: 'Corsie' });
    for (const lane of plan.lanes) {
      rowItems.push({
        kind: 'check',
        label: lane.name,
        checked: !display.visibility.hiddenLaneIds.includes(lane.id),
        onToggle: () => controls.toggleLane(lane.id),
      });
    }
  }
  if (several) {
    rowItems.push({ kind: 'separator' }, { kind: 'heading', label: 'Parti' });
    for (const part of shownParts) {
      rowItems.push({
        kind: 'check',
        label: PART_TITLES[part],
        icon: PART_ICONS[part],
        checked: !display.collapsed.includes(part),
        onToggle: () => controls.toggleCollapsed(part),
      });
    }
  }
  const someRowHidden =
    !display.showMetrics ||
    !display.showFreeNotes ||
    (parts.releases &&
      (!display.visibility.showNotes || display.visibility.hiddenLaneIds.length > 0));
  if (someRowHidden) {
    rowItems.push(
      { kind: 'separator' },
      { label: 'Mostra tutte le righe', icon: RotateCcw, onSelect: controls.showAllRows },
    );
  }
  const sortItems: MenuItem[] = ROADMAP_SORTS.map((sort) => ({
    kind: 'radio',
    label:
      sort === 'field' ? (sortField?.label ?? 'Campo con i colori') : ROADMAP_SORT_LABELS[sort],
    checked: display.sort === sort,
    disabled: sort === 'field' && !sortField,
    onSelect: () => controls.setSort(sort),
  }));
  const sortLabel =
    display.sort === 'field'
      ? (sortField?.label ?? 'Campo con i colori')
      : ROADMAP_SORT_LABELS[display.sort];
  const groupItems: MenuItem[] = [
    {
      kind: 'radio',
      label: 'Nessun gruppo',
      checked: groupBy === null,
      onSelect: () => controls.setGroupBy(null),
    },
    ...groupable.map((field): MenuItem => ({
      kind: 'radio',
      label: field.label,
      checked: groupBy?.id === field.id,
      onSelect: () => controls.setGroupBy(field.id),
    })),
  ];
  const toggleLabel = (labelId: string) =>
    controls.setLabelsFilter({
      ...labelsFilter,
      ids: labelsFilter.ids.includes(labelId)
        ? labelsFilter.ids.filter((id) => id !== labelId)
        : [...labelsFilter.ids, labelId],
    });
  const labelItems: MenuItem[] = [
    { kind: 'heading', label: 'Mostra i progetti con' },
    ...labels.map((label): MenuItem => ({
      kind: 'check',
      label: label.label,
      leading: <ColorSwatch colorId={label.colorId} />,
      checked: labelsFilter.ids.includes(label.id),
      onToggle: () => toggleLabel(label.id),
    })),
    {
      kind: 'check',
      label: 'Senza etichette',
      checked: labelsFilter.unlabeled,
      onToggle: () =>
        controls.setLabelsFilter({ ...labelsFilter, unlabeled: !labelsFilter.unlabeled }),
    },
    { kind: 'separator' },
    {
      kind: 'radio',
      label: 'Almeno una di quelle scelte',
      checked: labelsFilter.match === 'any',
      onSelect: () => controls.setLabelsFilter({ ...labelsFilter, match: 'any' }),
    },
    {
      kind: 'radio',
      label: 'Tutte quelle scelte',
      checked: labelsFilter.match === 'all',
      onSelect: () => controls.setLabelsFilter({ ...labelsFilter, match: 'all' }),
    },
    ...(filteringLabels
      ? ([
          { kind: 'separator' },
          {
            label: 'Togli il filtro',
            icon: RotateCcw,
            onSelect: () => controls.setLabelsFilter(NO_LABELS_FILTER),
          },
        ] satisfies MenuItem[])
      : []),
  ];
  const labelsWords = describeLabelsFilter(labelsFilter, labels);

  const statusItems: MenuItem[] = [
    {
      kind: 'radio',
      label: 'Tutti gli stati',
      checked: releases.status === null,
      onSelect: () => releases.onStatusChange(null),
    },
    ...TASK_STATUSES.map((status): MenuItem => ({
      kind: 'radio',
      label: TASK_STATUS_LABELS[status],
      icon: TASK_STATUS_ICONS[status],
      checked: releases.status === status,
      onSelect: () => releases.onStatusChange(status),
    })),
  ];

  const taskCounts = countByStatus(plan.tasks);
  const tasksFound =
    releases.status === null
      ? null
      : plan.tasks.filter((task) => task.status === releases.status).length;
  const onBoard = view.mode === 'week';

  return (
    <Area
      id={TIMELINE_AREA_ID}
      title={title}
      actions={
        <>
          <CalendarNav
            view={view}
            onViewAction={onViewAction}
            hidePastDays={display.hidePastDays}
            board={parts.releases}
          />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Menu
              label="Fatturato"
              items={metricsItems}
              align="end"
              title="Il fatturato previsto per giorno"
            >
              <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="max-sm:sr-only">{DAILY_METRIC.label}</span>
            </Menu>
            <Popover
              label="Aiuto e legenda"
              size="icon"
              panel={
                <HelpPanel
                  releases={parts.releases}
                  projects={parts.roadmaps}
                  people={parts.people}
                />
              }
            >
              <CircleHelp className="h-4 w-4" aria-hidden="true" />
            </Popover>
            <Menu
              id={NEW_ITEM_ID}
              label="Nuovo"
              items={newItems}
              align="end"
              variant="primary"
              size="md"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuovo
            </Menu>
          </div>
        </>
      }
    >
      {/* Clipped, not hidden: a hidden overflow would hold the rows at the top of the timeline,
          which stay in view as the page scrolls. */}
      <div className="divide-y divide-line overflow-clip rounded-xl border border-line bg-surface shadow-xs">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 bg-surface-muted px-3 py-2 select-none">
          <Menu label="Righe visibili" items={rowItems} title="Le righe da mostrare">
            <Rows3 className="h-3.5 w-3.5" aria-hidden="true" />
            Righe
          </Menu>
          {(parts.releases || parts.roadmaps) && (
            <LevelToggle
              level={display.level}
              teamAvailable={!roadmap.detailsUnavailable}
              onChange={controls.setLevel}
            />
          )}
          {parts.roadmaps && exceptions > 0 && (
            <span className="text-xs text-fg-muted">
              {exceptions === 1
                ? '1 progetto con righe proprie'
                : `${exceptions} progetti con righe proprie`}
            </span>
          )}
          {parts.roadmaps && (
            <>
              <Menu
                label="Ordina per"
                items={sortItems}
                title="L'ordine delle righe dei progetti; trascinando una riga si torna a «Personalizzato» partendo dall'ordine che si vede"
              >
                <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="max-sm:sr-only">Ordina:</span> {sortLabel}
              </Menu>
              <Menu
                label="Raggruppa per"
                items={groupItems}
                disabled={groupable.length === 0}
                title={
                  groupable.length === 0
                    ? 'Serve una lista di valori esclusivi con «Raggruppa»: Impostazioni → Roadmap → Campi, team e persone'
                    : 'Le righe dei progetti raggruppate per un campo'
                }
              >
                <Group className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="max-sm:sr-only">Raggruppa:</span> {groupBy?.label ?? 'No'}
              </Menu>
            </>
          )}
          {projectDays && (
            <Menu
              label="Filtra per etichette"
              items={labelItems}
              disabled={labels.length === 0}
              title={
                labels.length === 0
                  ? 'Le etichette si creano in Impostazioni → Roadmap → Etichette o nella finestra di un progetto'
                  : filteringLabels
                    ? `Solo i progetti con: ${labelsWords}`
                    : 'Solo i progetti con alcune etichette'
              }
              className={filteringLabels ? 'border-accent! bg-accent-soft!' : ''}
            >
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="max-sm:sr-only">Etichette{filteringLabels ? ':' : ''}</span>
              {filteringLabels && (
                <span className="max-w-48 truncate font-normal">{labelsWords}</span>
              )}
            </Menu>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Tooltip text="Festivi e weekend in rosso">
              <ToggleChip
                pressed={display.highlightWeekends}
                onClick={controls.toggleWeekends}
                label="Festivi e weekend"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-holiday-fg" aria-hidden="true" />
                <CalendarOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </ToggleChip>
            </Tooltip>
            {!onBoard && (
              <Tooltip text="Nascondi i giorni passati: la timeline parte da oggi">
                <ToggleChip
                  pressed={display.hidePastDays}
                  onClick={controls.togglePastDays}
                  label="Nascondi giorni passati"
                >
                  <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </ToggleChip>
              </Tooltip>
            )}
          </div>
        </div>

        {onBoard ? (
          <div className="bg-surface-muted p-3">
            <WeekBoard
              week={week}
              tasks={releases.tasks}
              lanes={plan.lanes}
              metrics={plan.metrics}
              dailyNotes={plan.dailyNotes}
              dayNotesColorId={dayNotesColorOf(plan.roadmap)}
              noteMatches={releases.noteMatches}
              showMetrics={display.showMetrics}
              highlightWeekends={display.highlightWeekends}
              closures={closures}
              textScale={textScale}
              compact={compact}
              visibility={display.visibility}
              onChangeTask={releases.onChangeTask}
              onOpenTask={releases.onOpenTask}
              onDuplicateTask={releases.onDuplicateTask}
              onAddTaskAt={releases.onAddTaskAt}
              onMoveNote={(from, to) => releases.onMoveNote(from, to)}
            />
            {parts.roadmaps && (
              <p className="pt-3 text-center text-xs text-fg-muted">
                La Bacheca mostra le attività della settimana: i progetti sono nelle altre viste.
              </p>
            )}
          </div>
        ) : (
          <div className="w-full bg-surface select-none">
            <TimelineFrame
              range={range}
              dayWidth={dayWidth}
              today={today}
              highlightWeekends={display.highlightWeekends}
              closures={closures}
              anchor={view.anchor}
              jump={view.jump}
              onScrolled={(first, last, settled) =>
                onViewAction({ type: 'scrolled', first, last, settled })
              }
              onResized={(viewport) => onViewAction({ type: 'resized', viewport })}
              onZoom={(step) => onViewAction({ type: 'zoomBy', step })}
              onShowDays={(date) => onViewAction({ type: 'goTo', date, zoom: 'detail' })}
              selectedDay={selectedDay}
              onSelectDay={onSelectDay}
              labelWidth={labelWidth}
              labelWidthPx={labelWidthPx}
              labelResize={{
                width: display.labelWidth,
                min: LABEL_WIDTH.min,
                max: LABEL_WIDTH.max,
                onChange: controls.setLabelWidth,
                onReset: () => controls.setLabelWidth(LABEL_WIDTH.default),
              }}
              metrics={display.showMetrics ? plan.metrics : null}
              textScale={textScale}
              compact={compact}
            >
              {(geometry) => (
                <>
                  {display.showFreeNotes && (
                    <TimelineNotesRow
                      geometry={geometry}
                      look={timelineNotes.look}
                      sources={{
                        dailyNotes: dayNotes,
                        memos: timelineNotes.memos,
                        milestones: freeShown,
                      }}
                      paperColor={timelineNotes.paperColor}
                      actions={{
                        onOpenDayNote: timelineNotes.onOpenDayNote,
                        onOpenMemo: timelineNotes.onOpenMemo,
                        onOpenMilestone: dialogs.openMilestone,
                      }}
                      tools={milestone.tools}
                      lineHeight={metrics.assignmentHeight + metrics.rowPadding * 2}
                      laneHeight={Math.max(NOTE_LANE_MIN, metrics.assignmentHeight + 4)}
                      onAdd={
                        searching || roadmap.unavailable
                          ? undefined
                          : (date) => dialogs.addMilestone(date)
                      }
                    />
                  )}
                  {parts.releases && (
                    <>
                      <SectionHeader
                        id={areaElementId('releases')}
                        title={PART_TITLES.releases}
                        icon={CalendarRange}
                        total={{ label: 'Attività', count: plan.tasks.length }}
                        counts={TASK_STATUSES.map((status) => ({
                          icon: TASK_STATUS_ICONS[status],
                          label: TASK_STATUS_PLURALS[status],
                          count: taskCounts[status],
                        }))}
                        found={tasksFound}
                        collapsed={display.collapsed.includes('releases')}
                        onToggleCollapsed={() => controls.toggleCollapsed('releases')}
                        rowsId={releasesRowsId}
                        width={geometry.totalWidth}
                        extra={
                          <Menu
                            label="Filtra per stato"
                            items={statusItems}
                            variant="ghost"
                            className="py-0.5"
                          >
                            {releases.status
                              ? TASK_STATUS_LABELS[releases.status]
                              : 'Tutti gli stati'}
                          </Menu>
                        }
                      />
                      {/* The lanes, then the notes of the days under the last of them. */}
                      <div id={releasesRowsId}>
                        {!display.collapsed.includes('releases') && (
                          <>
                            {noLaneShown ? (
                              <div className="sticky left-0 flex w-fit items-center gap-3 px-4 py-4 text-xs text-fg-muted">
                                <EyeOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                                Tutte le corsie sono nascoste
                                <Button size="sm" onClick={controls.showAllRows}>
                                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                  Mostra tutte le righe
                                </Button>
                              </div>
                            ) : (
                              <LanesSection
                                geometry={geometry}
                                tasks={releases.tasks}
                                lanes={visibleLanes}
                                sizes={sizes}
                                oneLineTitles={oneLineTitles}
                                onChangeTask={releases.onChangeTask}
                                onOpenTask={releases.onOpenTask}
                                onDuplicateTask={releases.onDuplicateTask}
                                onSplitTask={releases.onSplitTask}
                                onDeleteTask={releases.onDeleteTask}
                                onAddTaskAt={releases.onAddTaskAt}
                                onMoveLane={releases.onMoveLane}
                              />
                            )}
                            {display.visibility.showNotes && (
                              <NotesSection
                                geometry={geometry}
                                dailyNotes={plan.dailyNotes}
                                colorId={dayNotesColorOf(plan.roadmap)}
                                noteMatches={releases.noteMatches}
                                sizes={sizes}
                                oneLineTitles={oneLineTitles}
                                expanded={display.notesExpanded}
                                onToggleExpanded={controls.toggleNotesExpanded}
                                onSaveNote={releases.onSaveNote}
                                onMoveNote={releases.onMoveNote}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {parts.roadmaps && (
                    <>
                      <SectionHeader
                        id={areaElementId('roadmaps')}
                        title={PART_TITLES.roadmaps}
                        icon={MilestoneIcon}
                        total={{ label: 'Progetti', count: projects.length }}
                        counts={PROJECT_STATUSES.map((status) => ({
                          icon: PROJECT_STATUS_ICONS[status],
                          label: PROJECT_STATUS_PLURALS[status],
                          count: projects.filter((project) => project.status === status).length,
                        }))}
                        found={searching || filteringLabels ? roadmap.shown.length : null}
                        collapsed={display.collapsed.includes('roadmaps')}
                        onToggleCollapsed={() => controls.toggleCollapsed('roadmaps')}
                        rowsId={roadmapRowsId}
                        width={geometry.totalWidth}
                      />
                      <div id={roadmapRowsId}>
                        {!display.collapsed.includes('roadmaps') &&
                          (roadmap.unavailable ? (
                            <div className="sticky left-0 w-fit max-w-full p-3">
                              <RulesNotice what="I progetti" />
                            </div>
                          ) : (
                            <ProjectsSection
                              geometry={geometry}
                              projects={roadmap.shown}
                              spans={roadmap.spans}
                              level={level}
                              levelOf={levelOf}
                              teamLevelAvailable={!roadmap.detailsUnavailable}
                              config={plan.roadmap}
                              assignments={plan.assignments}
                              notes={plan.projectNotes}
                              nameOf={roadmap.nameOf}
                              searching={searching}
                              groupBy={groupBy}
                              metrics={metrics}
                              onOpen={(project) => dialogs.openProject(project)}
                              onDuplicateProject={roadmap.projectActions.onDuplicate}
                              onDuplicateAssignment={roadmap.assignmentActions.onDuplicate}
                              onDuplicateContingency={roadmap.projectActions.onDuplicateContingency}
                              onSplitWork={(item, choice) =>
                                item.kind === 'assignment'
                                  ? roadmap.assignmentActions.onSplit(item.id, choice)
                                  : roadmap.projectActions.onSplitContingency(
                                      item.projectId,
                                      item.id,
                                      choice,
                                    )
                              }
                              onAdd={() => dialogs.openNewProject(defaultDay)}
                              onAddAt={dialogs.openNewProject}
                              onChange={roadmap.projectActions.onUpdate}
                              onMove={roadmap.projectActions.onMove}
                              onOpenAssignment={dialogs.openAssignment}
                              onAddAssignment={dialogs.addAssignment}
                              onChangeAssignment={roadmap.assignmentActions.onUpdate}
                              onOpenStakeholder={dialogs.openStakeholder}
                              onSetProjectLevel={controls.setProjectLevel}
                              onReorder={roadmap.projectActions.onReorder}
                              milestones={roadmap.milestones}
                              allMilestones={plan.milestones}
                              milestoneTools={milestone.tools}
                              onAddMilestone={searching ? undefined : dialogs.addMilestone}
                            />
                          ))}
                      </div>
                    </>
                  )}

                  {parts.people && (
                    <>
                      <SectionHeader
                        id={areaElementId('people')}
                        title={PART_TITLES.people}
                        icon={UsersRound}
                        total={{ label: 'Persone', count: peopleWork.people }}
                        counts={[
                          {
                            icon: BriefcaseBusiness,
                            label: 'Al lavoro oggi',
                            count: peopleWork.atWorkToday,
                          },
                          {
                            icon: TriangleAlert,
                            label: 'Con più progetti insieme',
                            count: peopleWork.overbooked,
                          },
                        ]}
                        found={null}
                        collapsed={display.collapsed.includes('people')}
                        onToggleCollapsed={() => controls.toggleCollapsed('people')}
                        rowsId={peopleRowsId}
                        width={geometry.totalWidth}
                      />
                      <div id={peopleRowsId}>
                        {!display.collapsed.includes('people') &&
                          (roadmap.unavailable || roadmap.detailsUnavailable ? (
                            <div className="sticky left-0 w-fit max-w-full p-3">
                              <RulesNotice what="Le persone e il loro lavoro" />
                            </div>
                          ) : peopleWork.people === 0 ? (
                            <p className="sticky left-0 w-fit px-4 py-3 text-xs text-fg-muted">
                              Nessuna persona: si aggiungono in Impostazioni → Roadmap → Campi, team
                              e persone.
                            </p>
                          ) : (
                            <PeopleSection
                              geometry={geometry}
                              work={peopleWork}
                              assignments={plan.assignments}
                              metrics={metrics}
                              onOpenAssignment={dialogs.openAssignment}
                              onChangeAssignment={roadmap.assignmentActions.onUpdate}
                              onOpenStakeholder={dialogs.openStakeholder}
                              onDuplicateAssignment={roadmap.assignmentActions.onDuplicate}
                              onSplitAssignment={roadmap.assignmentActions.onSplit}
                            />
                          ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </TimelineFrame>
          </div>
        )}
      </div>

      {milestone.overlays}
      {dialogs.dialogs}
    </Area>
  );
}
