import { Fragment, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Diamond, Plus } from 'lucide-react';
import { assignmentsOfProject } from '../../domain/assignments';
import type { AssignmentChanges } from '../../domain/assignments';
import { applyChanges } from '../../domain/changes';
import type { ProjectChanges, ProjectWithEnd } from '../../domain/projects';
import { projectSpan } from '../../domain/projectSpan';
import type { ProjectSpan } from '../../domain/projectSpan';
import { groupProjects } from '../../domain/roadmapConfig';
import { ZOOM_DAY_WIDTH } from '../../domain/schedule';
import type { DateRange } from '../../domain/schedule';
import type {
  Assignment,
  FieldOption,
  Milestone,
  Project,
  ProjectField,
  RoadmapConfig,
  Stakeholder,
} from '../../domain/types';
import { useFormatDate } from '../../shared/dateFormat';
import { scaledTextStyle } from '../../shared/ui/textScale';
import type { TextScale } from '../../shared/ui/textScale';
import { useListDrag } from '../../shared/useListDrag';
import { useStableCallback } from '../../shared/useStableCallback';
import { followerOf } from '../../domain/projectOrder';
import { diffDays } from '../../utils/dateUtils';
import type { CalendarJump } from '../calendar/calendarView';
import { DragHint } from '../calendar/DragHint';
import { DayHeaderRow, MonthBand } from '../calendar/TimelineHeader';
import {
  LABEL_CELL,
  TIMELINE_SCROLLER,
  buildColumns,
  columnUnit,
} from '../calendar/timelineLayout';
import { formatManDays, workItemsOf } from './barRendering';
import type { BarRendering, WorkItem } from './barRendering';
import { FieldTag } from './fieldUi';
import { projectBarId } from './ProjectBar';
import { ProjectRow } from './ProjectRow';
import type { Editing } from './ProjectRow';
import type { DetailLevel } from './projectUi';
import { roadmapMetrics } from './roadmapLayout';
import { RowCells } from './RowCells';
import { useTimelineScroll } from '../calendar/useTimelineScroll';
import { useViewportWidth } from '../calendar/useViewportWidth';
import { useZoomGestures } from '../calendar/useZoomGestures';
import { useProjectDrag } from './useProjectDrag';
import { draggedWork, useWorkDrag } from './useWorkDrag';
import type { WorkChanges } from './useWorkDrag';
import { workBarId } from './WorkBar';
import { MilestoneLayer, milestoneElementId } from './MilestoneDiamond';
import type { MilestoneTools } from './MilestoneDiamond';
import { freeMilestones, milestonesOfProject, moveMilestone } from '../../domain/milestones';
import type { MilestoneChanges } from '../../domain/milestones';
import { HoverCard, useHoverCard } from '../../shared/ui/HoverCard';
import { usePointerDrag } from '../calendar/usePointerDrag';
import { taskColorStyle } from '../../themes';

interface RoadmapTimelineProps {
  /** The projects to show, one per row, in the order of the rows, each with its effective end. */
  projects: ProjectWithEnd[];
  /** Where each project falls: the work of its team, its days, its gaps. */
  spans: ReadonlyMap<string, ProjectSpan>;
  /** The days the roadmap holds; it scrolls through them. */
  range: DateRange;
  /** Pixels per day, as the view sets them. */
  dayWidth: number;
  /** The first day in view when the roadmap opens, where the user left it. */
  anchor: string;
  /** The last navigation: the roadmap scrolls so that its day is at the left edge. */
  jump: CalendarJump;
  onScrolled: (first: string, last: string, settled: boolean) => void;
  /** The width of the days beside the column of the projects, on opening and once the window settles. */
  onResized: (width: number) => void;
  today: string;
  highlightWeekends: boolean;
  /** How much each row shows under the title of its project, unless the project has a choice of its own. */
  level: DetailLevel;
  levelOf: (projectId: string) => DetailLevel;
  /** The published rules know the assignments: the Team level can be chosen. */
  teamLevelAvailable: boolean;
  /** How the work of the team is drawn in the bar of a project. */
  rendering: BarRendering;
  /** The custom fields, the teams and the people, to show the main fields and the assignments. */
  config: RoadmapConfig;
  assignments: Assignment[];
  /** While searching, the rows are those found, and no row adds a project. */
  searching: boolean;
  /** Titles on one line, out of their bars when longer, rather than cut. */
  oneLineTitles: boolean;
  /** A field that groups: the projects with the same value go together, under its tag. */
  groupBy: ProjectField | null;
  textScale: TextScale;
  compact: boolean;
  /** -1 zooms in, 1 zooms out. */
  onZoom: (step: -1 | 1) => void;
  /** Shows the days of a week, from the quarter view. */
  onShowDays: (date: string) => void;
  onOpen: (project: Project) => void;
  /** Adds a project from the days in view, as the button above the roadmap does. */
  onAdd: () => void;
  /** Adds a project from a day. */
  onAddAt: (date: string) => void;
  onChange: (projectId: string, changes: ProjectChanges) => void;
  /** Moves a project by some days with the work of its team. */
  onMove: (projectId: string, days: number) => void;
  onOpenAssignment: (assignment: Assignment) => void;
  onAddAssignment: (project: Project) => void;
  onChangeAssignment: (assignmentId: string, changes: AssignmentChanges) => void;
  onOpenStakeholder: (stakeholder: Stakeholder) => void;
  /** The rows of one project, or null to follow the roadmap again. */
  onSetProjectLevel: (projectId: string, level: DetailLevel | null) => void;
  /** Puts a project right before another in the order of the members, or last with null. */
  onReorder: (projectId: string, beforeId: string | null) => void;
  /** The notes on the timeline to show: all of them, or those the search finds. */
  milestones: Milestone[];
  projectTitleOf: (projectId: string) => string | undefined;
  onOpenMilestone: (milestone: Milestone) => void;
  /** Adds a note on a day, of a project when one is given. */
  onAddMilestone: (date: string, projectId?: string) => void;
  onChangeMilestone: (milestoneId: string, changes: MilestoneChanges) => void;
}

/** The text of a note on the timeline, in the card that opens on it. */
function MilestoneDetails({
  milestone,
  projectTitle,
}: {
  milestone: Milestone;
  projectTitle: string | undefined;
}) {
  const formatDate = useFormatDate();
  return (
    <div className="space-y-1 text-sm">
      <p className="flex items-center gap-2 font-bold">
        <span
          aria-hidden="true"
          style={taskColorStyle(milestone.colorId)}
          className="block h-3 w-3 shrink-0 rotate-45 rounded-[2px] border-2"
        />
        <span className="min-w-0 break-words">{milestone.title}</span>
      </p>
      <p className="text-xs text-fg-muted">
        {formatDate(milestone.date)}
        {projectTitle ? ` · ${projectTitle}` : ' · nessun progetto'}
        {milestone.remind ? ' · con avviso' : ''}
      </p>
      {milestone.body && <p className="whitespace-pre-line break-words">{milestone.body}</p>}
    </div>
  );
}

/** The type of the rows dragged in the column of the projects: nothing else lands among them. */
const PROJECT_DRAG_TYPE = 'application/x-release-board-project';

/**
 * The row above a group of projects: the value they share, as its tag, and how many they are. A
 * heading, so that a screen reader can move from group to group.
 */
function GroupHeader({
  field,
  option,
  count,
  width,
  todayOffset,
  minHeight,
}: {
  field: ProjectField;
  option: FieldOption | null;
  count: number;
  width: number;
  todayOffset: number | null;
  minHeight: number;
}) {
  return (
    <div
      className="grid border-b border-line-strong bg-surface-strong"
      style={{ gridTemplateColumns: 'var(--gantt-label-width) auto' }}
    >
      <div
        className={`${LABEL_CELL} flex items-center bg-surface-strong`}
        style={{ gridColumn: 1, gridRow: 1, minHeight }}
      >
        <h3 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="sr-only">{field.label}:</span>
          {option ? (
            <FieldTag colorId={option.colorId}>{option.label}</FieldTag>
          ) : (
            <span className="font-semibold">Senza valore</span>
          )}
          <span className="text-fg-muted">
            {count} {count === 1 ? 'progetto' : 'progetti'}
          </span>
        </h3>
      </div>
      <div className="relative" style={{ gridColumn: 2, gridRow: 1, width }}>
        {todayOffset !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-link"
            style={{ left: todayOffset }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The roadmap: a row for each project, past, current or to come, with a bar from its start to its
 * end over the same days as the calendar, and at the "Team" level a row for each bar of the work,
 * the people in the color of their team and the contingency. The last row adds a project with a
 * click on a day.
 */
export function RoadmapTimeline({
  projects,
  spans,
  range,
  dayWidth,
  anchor,
  jump,
  onScrolled,
  onResized,
  today,
  highlightWeekends,
  level,
  levelOf,
  teamLevelAvailable,
  rendering,
  config,
  assignments,
  searching,
  textScale,
  compact,
  oneLineTitles,
  groupBy,
  onZoom,
  onShowDays,
  onOpen,
  onAdd,
  onAddAt,
  onChange,
  onMove,
  onOpenAssignment,
  onAddAssignment,
  onChangeAssignment,
  onOpenStakeholder,
  onSetProjectLevel,
  onReorder,
  milestones,
  projectTitleOf,
  onOpenMilestone,
  onAddMilestone,
  onChangeMilestone,
}: RoadmapTimelineProps) {
  const formatDate = useFormatDate();
  const metrics = roadmapMetrics(dayWidth, textScale, compact, level);
  const { barHeight, assignmentHeight, rowPadding, labelWidth } = metrics;
  const columns = useMemo(
    () => buildColumns(range, dayWidth, highlightWeekends, today),
    [range, dayWidth, highlightWeekends, today],
  );
  const weekColumns = columnUnit(dayWidth) === 'week';
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const todayOffset =
    range.start <= today && today <= range.end
      ? (diffDays(range.start, today) + 0.5) * dayWidth
      : null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const helpId = useId();
  const workHelpId = useId();
  const { drag, startDrag, isClickAfterDrag } = useProjectDrag(dayWidth, onChange, onMove);
  // A bar of work changed by hand: an assignment goes to its own document, the contingency lives
  // on the project, and a start moved by hand makes the arrangement manual.
  const changeWork = (item: WorkItem, changes: WorkChanges) => {
    if (item.kind === 'assignment') {
      onChangeAssignment(item.id, changes);
      return;
    }
    const contingency = {
      startDate: changes.startDate ?? item.startDate,
      manDays: changes.manDays ?? item.manDays,
    };
    onChange(
      item.projectId,
      changes.startDate ? { contingency, arrangement: 'manual' } : { contingency },
    );
  };
  const workDrag = useWorkDrag(dayWidth, changeWork);
  const [editing, setEditing] = useState<Editing | null>(null);
  const spanOf = (project: ProjectWithEnd): ProjectSpan =>
    spans.get(project.id) ?? projectSpan(project, assignments, config.stakeholders);
  const workOf = useMemo(
    () =>
      new Map(
        projects.map((project) => [
          project.id,
          workItemsOf(
            project,
            spans.get(project.id) ?? projectSpan(project, assignments, config.stakeholders),
            config,
          ),
        ]),
      ),
    [projects, spans, assignments, config],
  );

  useZoomGestures(scrollRef, onZoom);
  useViewportWidth(scrollRef, onResized);
  useTimelineScroll(scrollRef, {
    range,
    dayWidth,
    labelWidth,
    openOn: anchor,
    jump,
    onScrolled,
  });

  const addAt = useStableCallback(onAddAt);
  const showDays = useStableCallback(onShowDays);
  // The rows follow the start of their projects: a move from the keyboard can change the row, and
  // the focus follows the bar there.
  const [announcement, setAnnouncement] = useState('');
  const refocus = (id: string) =>
    window.requestAnimationFrame(() => document.getElementById(id)?.focus());
  const changeByKey = (project: ProjectWithEnd, changes: ProjectChanges) => {
    onChange(project.id, changes);
    const after = applyChanges(project, changes);
    setAnnouncement(
      `«${project.title}» dal ${formatDate(after.startDate)} al ${formatDate(after.endDate ?? project.endDate)}`,
    );
    refocus(projectBarId(project.id));
  };
  const moveByKey = (project: ProjectWithEnd, days: number) => {
    onMove(project.id, days);
    setAnnouncement(
      `«${project.title}» spostato di ${Math.abs(days)} giorni ${days > 0 ? 'avanti' : 'indietro'}`,
    );
    refocus(projectBarId(project.id));
  };
  const changeWorkByKey = (item: WorkItem, changes: WorkChanges) => {
    changeWork(item, changes);
    if (changes.startDate) setAnnouncement(`${item.name} dal ${formatDate(changes.startDate)}`);
    if (changes.manDays) setAnnouncement(`${item.name}: ${formatManDays(changes.manDays)}`);
    refocus(workBarId(item));
  };

  // The notes on the timeline: dragged by the day, with a card for their text.
  const milestoneHelpId = useId();
  const milestoneCard = useHoverCard<Milestone>();
  const milestoneDrag = usePointerDrag<{ milestone: Milestone; days: number }>(
    (current, delta) => {
      const days = Math.round(delta.x / dayWidth);
      return days === current.days ? current : { ...current, days };
    },
    (done) => {
      if (done.days === 0) return;
      onChangeMilestone(done.milestone.id, { date: moveMilestone(done.milestone, done.days).date });
    },
  );
  const milestoneTools: MilestoneTools = {
    dragged: milestoneDrag.drag
      ? moveMilestone(milestoneDrag.drag.milestone, milestoneDrag.drag.days)
      : null,
    startDrag: (event, milestone) => {
      if (milestoneDrag.start(event, { milestone, days: 0 })) event.stopPropagation();
    },
    ignoreClick: milestoneDrag.isClickAfterDrag,
    hover: (milestone) => {
      const { onPointerEnter, onPointerLeave, onFocus, onBlur } =
        milestoneCard.triggerProps(milestone);
      return { onPointerEnter, onPointerLeave, onFocus, onBlur };
    },
    helpId: milestoneHelpId,
    onOpen: onOpenMilestone,
    onChange: (milestoneId, changes) => {
      onChangeMilestone(milestoneId, changes);
      if (changes.date) {
        setAnnouncement(`Nota sulla timeline il ${formatDate(changes.date)}`);
        refocus(milestoneElementId(milestoneId));
      }
    },
    projectTitleOf,
  };
  const free = freeMilestones(milestones);
  const addFreeNote = useStableCallback((date: string) => onAddMilestone(date));
  const freeNoteTitle = useStableCallback(
    (date: string) => `Nuova nota sulla timeline il ${formatDate(date)}`,
  );
  const milestoneRowHeight = assignmentHeight + rowPadding * 2;

  const rowStyle = { gridTemplateColumns: 'var(--gantt-label-width) auto' };
  // Without a field to group by, one group of every project and no header.
  const groups = groupBy ? groupProjects(projects, groupBy) : [{ option: null, projects }];
  const listOf = (group: { option: FieldOption | null }) => group.option?.id ?? 'none';
  // A row dragged lands before the project at the slot of its group, or after the last one.
  const rowDrag = useListDrag(PROJECT_DRAG_TYPE, (projectId, list, index) => {
    const group = groups.find((item) => listOf(item) === list);
    if (group) onReorder(projectId, followerOf(group.projects, projectId, index));
  });
  const moveRowByKey = (project: ProjectWithEnd, delta: -1 | 1) => {
    const group = groups.find((item) => item.projects.some((p) => p.id === project.id));
    if (!group) return;
    const at = group.projects.findIndex((p) => p.id === project.id);
    if ((delta < 0 && at === 0) || (delta > 0 && at === group.projects.length - 1)) return;
    onReorder(project.id, followerOf(group.projects, project.id, delta > 0 ? at + 1 : at - 1));
    setAnnouncement(`«${project.title}» spostato ${delta > 0 ? 'giù' : 'su'} di una riga`);
    refocus(projectBarId(project.id));
  };
  const projectRowHeight = barHeight + rowPadding * 2;

  return (
    <div className="w-full bg-surface select-none">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <p id={helpId} className="sr-only">
        Frecce sinistra e destra spostano il progetto di una settimana, con il lavoro del suo team;
        con Maiusc cambiano la fine pianificata; con Alt, frecce su e giù lo spostano
        nell&apos;ordine delle righe. Invio lo apre.
      </p>
      <p id={workHelpId} className="sr-only">
        Frecce sinistra e destra spostano l&apos;inizio del lavoro di un giorno; con Maiusc di una
        settimana. Invio apre il lavoro; un doppio clic scrive i giorni uomo.
      </p>
      <p id={milestoneHelpId} className="sr-only">
        Frecce sinistra e destra spostano la nota di un giorno; con Maiusc di una settimana. Invio
        la apre.
      </p>
      {/*
        Relative, so that hidden labels placed absolutely stay inside the scroll area. On phones the
        column of the projects takes at most two fifths of the screen.
      */}
      <div
        ref={scrollRef}
        data-compact={compact || undefined}
        style={
          {
            ...scaledTextStyle(textScale, compact),
            '--gantt-label-width': `min(${labelWidth}px, 40vw)`,
          } as CSSProperties
        }
        className={TIMELINE_SCROLLER}
      >
        <div style={{ width: `calc(var(--gantt-label-width) + ${totalWidth}px)` }}>
          <MonthBand range={range} dayWidth={dayWidth} metrics={null} />
          <DayHeaderRow
            columns={columns}
            weekColumns={weekColumns}
            showMonth={dayWidth >= ZOOM_DAY_WIDTH.detail}
            onShowDays={showDays}
          />

          <div>
            {/* The notes of no project: a row of their own at the top, a click on a day adds one. */}
            <div className="grid border-b border-line-strong" style={rowStyle}>
              <div
                className={`${LABEL_CELL} flex items-center gap-1.5 bg-surface-muted text-xs`}
                style={{ gridColumn: 1, gridRow: 1, minHeight: milestoneRowHeight }}
              >
                <Diamond className="h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
                <span className="font-semibold">Note sulla timeline</span>
                {free.length > 0 && <span className="text-fg-muted">{free.length}</span>}
              </div>
              <div
                className="relative flex"
                style={{
                  gridColumn: 2,
                  gridRow: 1,
                  width: totalWidth,
                  minHeight: milestoneRowHeight,
                }}
              >
                <RowCells
                  columns={columns}
                  onAdd={searching ? undefined : addFreeNote}
                  addTitle={freeNoteTitle}
                />
                {todayOffset !== null && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-link"
                    style={{ left: todayOffset }}
                  />
                )}
                <MilestoneLayer
                  milestones={free}
                  range={range}
                  dayWidth={dayWidth}
                  top="50%"
                  tools={milestoneTools}
                />
              </div>
            </div>
            {groups.map((group) => (
              <Fragment key={group.option?.id ?? 'none'}>
                {groupBy && (
                  <GroupHeader
                    field={groupBy}
                    option={group.option}
                    count={group.projects.length}
                    width={totalWidth}
                    todayOffset={todayOffset}
                    minHeight={assignmentHeight + rowPadding * 2}
                  />
                )}
                <div {...rowDrag.container}>
                  {group.projects.map((project, index) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      dragSource={rowDrag.source(project.id, listOf(group))}
                      dragTarget={rowDrag.target(
                        listOf(group),
                        group.projects.map((item) => item.id),
                        index,
                        'y',
                      )}
                      dropBefore={rowDrag.slot(listOf(group)) === index}
                      dropAfter={
                        index === group.projects.length - 1 &&
                        rowDrag.slot(listOf(group)) === group.projects.length
                      }
                      rowDragging={rowDrag.dragged === project.id}
                      onMoveRow={(delta) => moveRowByKey(project, delta)}
                      span={spanOf(project)}
                      work={workOf.get(project.id) ?? []}
                      assignments={assignmentsOfProject(assignments, project.id)}
                      level={levelOf(project.id)}
                      defaultLevel={level}
                      teamLevelAvailable={teamLevelAvailable}
                      rendering={rendering}
                      columns={columns}
                      totalWidth={totalWidth}
                      todayOffset={todayOffset}
                      range={range}
                      dayWidth={dayWidth}
                      metrics={metrics}
                      oneLineTitles={oneLineTitles}
                      searching={searching}
                      config={config}
                      groupBy={groupBy}
                      projectDrag={drag}
                      workDrag={workDrag.drag}
                      editing={editing}
                      helpId={helpId}
                      workHelpId={workHelpId}
                      ignoreProjectClick={isClickAfterDrag}
                      ignoreWorkClick={workDrag.isClickAfterDrag}
                      onStartProjectDrag={startDrag}
                      onStartWorkDrag={workDrag.startDrag}
                      onEdit={setEditing}
                      onOpen={() => onOpen(project)}
                      onChange={(changes) => changeByKey(project, changes)}
                      onMove={(days) => moveByKey(project, days)}
                      onChangeWork={changeWorkByKey}
                      onOpenAssignment={onOpenAssignment}
                      onAddAssignment={() => onAddAssignment(project)}
                      onOpenStakeholder={onOpenStakeholder}
                      onSetLevel={(next) => onSetProjectLevel(project.id, next)}
                      milestones={milestonesOfProject(milestones, project.id)}
                      milestoneTools={milestoneTools}
                      onAddMilestone={
                        searching ? undefined : (date) => onAddMilestone(date, project.id)
                      }
                    />
                  ))}
                </div>
              </Fragment>
            ))}

            {searching ? (
              projects.length === 0 && (
                <p className="sticky left-0 w-fit px-4 py-3 text-xs text-fg-muted">
                  Nessun progetto con questo testo.
                </p>
              )
            ) : (
              <div className="grid" style={rowStyle}>
                {/* The row that adds a project: a button in the column, a day to click beside it. */}
                <div
                  className={`${LABEL_CELL} flex items-center bg-surface-muted`}
                  style={{ gridColumn: 1, gridRow: 1, minHeight: projectRowHeight }}
                >
                  <button
                    type="button"
                    onClick={onAdd}
                    title="Crea un progetto da oggi, o dal mese in vista. Per partire da un altro giorno, clic su quel giorno in questa riga"
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong px-2 py-1.5 text-xs font-semibold text-link hover:border-link hover:bg-accent-soft"
                  >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Nuovo progetto
                  </button>
                </div>
                <div className="relative flex" style={{ gridColumn: 2, gridRow: 1 }}>
                  <RowCells columns={columns} onAdd={addAt} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {drag && (
        <DragHint>
          {drag.kind === 'move' ? 'Sposta' : drag.kind === 'start' ? 'Inizio' : 'Fine pianificata'}{' '}
          <strong className="tabular-nums">
            {drag.days > 0 ? `+${drag.days}` : drag.days}{' '}
            {Math.abs(drag.days) === 1 ? 'giorno' : 'giorni'}
          </strong>
        </DragHint>
      )}
      {milestoneDrag.drag && (
        <DragHint>
          Nota il <strong>{formatDate(milestoneTools.dragged?.date ?? '')}</strong>
        </DragHint>
      )}
      {milestoneCard.card && (
        <HoverCard
          anchor={milestoneCard.card.anchor}
          cardRef={milestoneCard.cardProps.cardRef}
          onPointerEnter={milestoneCard.cardProps.onPointerEnter}
          onPointerLeave={milestoneCard.cardProps.onPointerLeave}
        >
          <MilestoneDetails
            milestone={milestoneCard.card.item}
            projectTitle={
              milestoneCard.card.item.projectId
                ? projectTitleOf(milestoneCard.card.item.projectId)
                : undefined
            }
          />
        </HoverCard>
      )}
      {workDrag.drag && (
        <DragHint>
          {workDrag.drag.kind === 'move' ? (
            <>
              Inizio del lavoro <strong>{formatDate(draggedWork(workDrag.drag).startDate)}</strong>
            </>
          ) : (
            <>
              Giorni uomo{' '}
              <strong className="tabular-nums">
                {formatManDays(draggedWork(workDrag.drag).manDays)}
              </strong>
            </>
          )}
        </DragHint>
      )}
    </div>
  );
}
