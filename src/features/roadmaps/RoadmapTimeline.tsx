import { memo, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Plus, UserRound } from 'lucide-react';
import { assignmentsOfProject, scheduleAssignment } from '../../domain/assignments';
import type { AssignmentChanges } from '../../domain/assignments';
import { applyChanges } from '../../domain/changes';
import type { ProjectChanges } from '../../domain/projects';
import { teamOf } from '../../domain/roadmapConfig';
import { ZOOM_COLUMN_UNIT, placeTasks } from '../../domain/schedule';
import type { DateRange, ZoomLevel } from '../../domain/schedule';
import type {
  Assignment,
  Project,
  ProjectField,
  RoadmapConfig,
  Stakeholder,
} from '../../domain/types';
import { prefersReducedMotion } from '../../shared/motion';
import { Highlight } from '../../shared/ui/Highlight';
import { scaledTextStyle } from '../../shared/ui/textScale';
import type { TextScale } from '../../shared/ui/textScale';
import { useStableCallback } from '../../shared/useStableCallback';
import { diffDays, formatDateToIT } from '../../utils/dateUtils';
import type { CalendarJump } from '../calendar/calendarView';
import { DragHint } from '../calendar/DragHint';
import { DayHeaderRow, MonthBand } from '../calendar/TimelineHeader';
import {
  LABEL_CELL,
  TIMELINE_SCROLLER,
  buildColumns,
  clampLines,
  columnEdge,
} from '../calendar/timelineLayout';
import type { Column } from '../calendar/timelineLayout';
import { useTimelineScroll } from '../calendar/useTimelineScroll';
import { useZoomGestures } from '../calendar/useZoomGestures';
import { AssignmentBar, assignmentBarId } from './AssignmentBar';
import { FieldValueList } from './fieldUi';
import { ProjectBar, projectBarId } from './ProjectBar';
import { ProjectStatusMark } from './projectUi';
import type { DetailLevel } from './projectUi';
import { projectPeriod, roadmapMetrics } from './roadmapLayout';
import { draggedAssignment, useAssignmentDrag } from './useAssignmentDrag';
import { draggedProject, useProjectDrag } from './useProjectDrag';

interface RoadmapTimelineProps {
  /** The projects to show, one per row, in the order of the rows. */
  projects: Project[];
  /** The days the roadmap holds; it scrolls through them. */
  range: DateRange;
  zoom: ZoomLevel;
  /** The first day in view when the roadmap opens, where the user left it. */
  anchor: string;
  /** The last navigation: the roadmap scrolls so that its day is at the left edge. */
  jump: CalendarJump;
  onScrolled: (first: string, last: string, settled: boolean) => void;
  today: string;
  highlightWeekends: boolean;
  /** How much each row shows under the title of its project. */
  level: DetailLevel;
  /** The custom fields, the teams and the people, to show the main fields and the assignments. */
  config: RoadmapConfig;
  assignments: Assignment[];
  /** While searching, the rows are those found, and no row adds a project. */
  searching: boolean;
  /** Titles on one line, out of their bars when longer, rather than cut. */
  oneLineTitles: boolean;
  textScale: TextScale;
  compact: boolean;
  /** -1 zooms in, 1 zooms out. */
  onZoom: (step: -1 | 1) => void;
  /** Shows the days of a week, from the quarter view. */
  onShowDays: (date: string) => void;
  onOpen: (project: Project) => void;
  /** Adds a project from a day. */
  onAddAt: (date: string) => void;
  onChange: (projectId: string, changes: ProjectChanges) => void;
  onOpenAssignment: (assignment: Assignment) => void;
  onAddAssignment: (project: Project) => void;
  onChangeAssignment: (assignmentId: string, changes: AssignmentChanges) => void;
  onOpenStakeholder: (stakeholder: Stakeholder) => void;
}

/** The days of a row, past ones grey and holidays red: memoized, since a drag redraws only the bars. */
const RowCells = memo(function RowCells({
  columns,
  onAdd,
}: {
  columns: Column[];
  /** Clicking a day adds a project there, in the row that adds them. */
  onAdd?: (date: string) => void;
}) {
  return columns.map((column) => (
    <div
      key={column.start}
      onClick={onAdd && (() => onAdd(column.start))}
      title={onAdd ? `Nuovo progetto dal ${formatDateToIT(column.start)}` : undefined}
      className={`flex shrink-0 items-center justify-center ${columnEdge(column)} ${
        column.past ? 'bg-past' : column.red ? 'bg-holiday' : ''
      } ${
        // The plus is drawn by CSS: one icon element per day would weigh on long roadmaps.
        onAdd
          ? "cursor-pointer text-base text-link after:opacity-0 after:content-['+'] hover:bg-accent-soft hover:after:opacity-100 pointer-coarse:after:hidden"
          : ''
      }`}
      style={{ width: column.width }}
    />
  ));
});

/** Brings the bar of a project into view, past or future as it may be. */
function showBar(projectId: string): void {
  document.getElementById(projectBarId(projectId))?.scrollIntoView({
    inline: 'center',
    block: 'nearest',
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
}

/** The title of a project and, from the "Info principali" level on, what describes it. */
function ProjectInfo({
  project,
  level,
  fields,
  descriptionLines,
  onOpen,
}: {
  project: Project;
  level: DetailLevel;
  fields: readonly ProjectField[];
  descriptionLines: number;
  onOpen: () => void;
}) {
  return (
    <>
      {/*
        Out of the tab order: the bar is the project for the keyboard. A click opens the project,
        as on the bar, and brings the bar into view behind the window: it may be far in the past
        or in the future.
      */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          showBar(project.id);
          onOpen();
        }}
        title="Apri il progetto"
        className="cursor-pointer text-left text-xs font-bold wrap-break-word hyphens-auto hover:underline"
      >
        <Highlight text={project.title} />
      </button>
      {level !== 'titles' && (
        <>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-muted">
            <ProjectStatusMark status={project.status} />
            <span
              title={`${formatDateToIT(project.startDate)} → ${formatDateToIT(project.endDate)}`}
            >
              {projectPeriod(project)}
            </span>
            {project.owner && (
              <span className="flex min-w-0 items-center gap-1">
                <UserRound className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  <Highlight text={project.owner} />
                </span>
              </span>
            )}
          </span>
          {project.description && (
            <span
              style={clampLines(descriptionLines)}
              className="text-xs whitespace-pre-line text-fg-muted"
            >
              <Highlight text={project.description} />
            </span>
          )}
          {fields
            .filter((field) => field.main)
            .map((field) => (
              <span key={field.id} className="text-xs wrap-break-word">
                <FieldValueList
                  project={project}
                  field={field}
                  before={<span className="font-semibold text-fg-muted">{field.label}: </span>}
                />
              </span>
            ))}
        </>
      )}
    </>
  );
}

/**
 * The roadmap: a row for each project, past, current or to come, with a bar from its start to its
 * end over the same days as the calendar, and at the "Team" level a row for each person who works
 * on it, with their bar in the color of their team. The last row adds a project with a click on a
 * day.
 */
export function RoadmapTimeline({
  projects,
  range,
  zoom,
  anchor,
  jump,
  onScrolled,
  today,
  highlightWeekends,
  level,
  config,
  assignments,
  searching,
  textScale,
  compact,
  oneLineTitles,
  onZoom,
  onShowDays,
  onOpen,
  onAddAt,
  onChange,
  onOpenAssignment,
  onAddAssignment,
  onChangeAssignment,
  onOpenStakeholder,
}: RoadmapTimelineProps) {
  const metrics = roadmapMetrics(zoom, textScale, compact);
  const { dayWidth, barHeight, assignmentHeight, rowPadding, labelWidth } = metrics;
  const columns = useMemo(
    () => buildColumns(range, zoom, highlightWeekends, today),
    [range, zoom, highlightWeekends, today],
  );
  const weekColumns = ZOOM_COLUMN_UNIT[zoom] === 'week';
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const todayOffset =
    range.start <= today && today <= range.end
      ? (diffDays(range.start, today) + 0.5) * dayWidth
      : null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const helpId = useId();
  const assignmentHelpId = useId();
  const { drag, startDrag, isClickAfterDrag } = useProjectDrag(dayWidth, onChange);
  const personDrag = useAssignmentDrag(dayWidth, onChangeAssignment);

  useZoomGestures(scrollRef, onZoom);
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
  const changeByKey = (project: Project, changes: ProjectChanges) => {
    onChange(project.id, changes);
    const after = applyChanges(project, changes);
    setAnnouncement(
      `«${project.title}» dal ${formatDateToIT(after.startDate)} al ${formatDateToIT(after.endDate)}`,
    );
    window.requestAnimationFrame(() => document.getElementById(projectBarId(project.id))?.focus());
  };
  const changeAssignmentByKey = (assignment: Assignment, changes: AssignmentChanges) => {
    onChangeAssignment(assignment.id, changes);
    const name = config.stakeholders.find((item) => item.id === assignment.stakeholderId)?.name;
    if (changes.startDate) {
      setAnnouncement(`${name ?? 'Persona'} dal ${formatDateToIT(changes.startDate)}`);
    }
    window.requestAnimationFrame(() =>
      document.getElementById(assignmentBarId(assignment.id))?.focus(),
    );
  };

  const rowStyle = { gridTemplateColumns: 'var(--gantt-label-width) auto' };
  const projectRowHeight = barHeight + rowPadding * 2;
  const personRowHeight = assignmentHeight + rowPadding;

  return (
    <div className="w-full bg-surface select-none">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <p id={helpId} className="sr-only">
        Frecce sinistra e destra spostano il progetto di una settimana; con Maiusc cambiano la data
        di fine. Invio lo apre.
      </p>
      <p id={assignmentHelpId} className="sr-only">
        Frecce sinistra e destra spostano l&apos;inizio del lavoro di un giorno; con Maiusc di una
        settimana. Invio apre l&apos;assegnazione.
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
            showMonth={zoom === 'detail'}
            onShowDays={showDays}
          />

          <div>
            {projects.map((project) => {
              const shown = drag?.project.id === project.id ? draggedProject(drag) : project;
              const placed = placeTasks([shown], range).placed[0];
              const people = level === 'team' ? assignmentsOfProject(assignments, project.id) : [];
              const rows = 1 + people.length + (level === 'team' && !searching ? 1 : 0);
              return (
                <div key={project.id} className="grid border-b border-line" style={rowStyle}>
                  <div
                    className="relative flex"
                    style={{ gridColumn: 2, gridRow: `1 / span ${rows}`, width: totalWidth }}
                  >
                    <RowCells columns={columns} />
                    {todayOffset !== null && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-link"
                        style={{ left: todayOffset }}
                      />
                    )}
                  </div>

                  <div
                    className={`${LABEL_CELL} flex flex-col justify-center gap-0.5 bg-surface-muted`}
                    style={{ gridColumn: 1, gridRow: 1, minHeight: projectRowHeight }}
                  >
                    <ProjectInfo
                      project={project}
                      level={level}
                      fields={config.fields}
                      descriptionLines={metrics.descriptionLines}
                      onOpen={() => onOpen(project)}
                    />
                  </div>
                  <div
                    className="pointer-events-none relative"
                    style={{ gridColumn: 2, gridRow: 1, minHeight: projectRowHeight }}
                  >
                    {placed && (
                      <ProjectBar
                        placed={placed}
                        dayWidth={dayWidth}
                        top={`calc(50% - ${barHeight / 2}px)`}
                        height={barHeight}
                        overflowTitle={oneLineTitles}
                        dragging={drag?.project.id === project.id}
                        describedBy={helpId}
                        onPointerDown={(event, kind) => startDrag(event, project, kind)}
                        onOpen={() => {
                          if (!isClickAfterDrag()) onOpen(project);
                        }}
                        onChange={(changes) => changeByKey(project, changes)}
                      />
                    )}
                  </div>

                  {people.map((assignment, index) => {
                    const stakeholder =
                      config.stakeholders.find((item) => item.id === assignment.stakeholderId) ??
                      null;
                    const team = stakeholder ? teamOf(config, stakeholder) : null;
                    const moving =
                      personDrag.drag?.assignment.id === assignment.id
                        ? draggedAssignment(personDrag.drag)
                        : assignment;
                    const schedule = scheduleAssignment(moving, stakeholder?.absences ?? []);
                    const gridRow = index + 2;
                    return (
                      <div key={assignment.id} className="contents">
                        <div
                          className={`${LABEL_CELL} flex items-center gap-1.5 border-t border-line/60 bg-surface-muted text-xs`}
                          style={{ gridColumn: 1, gridRow, minHeight: personRowHeight }}
                        >
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-full border border-line-strong"
                            style={
                              team
                                ? { backgroundColor: `var(--rb-task-${team.colorId}-border)` }
                                : undefined
                            }
                          />
                          {stakeholder ? (
                            <button
                              type="button"
                              onClick={() => onOpenStakeholder(stakeholder)}
                              title="Modifica la persona: nome, team, info e assenze"
                              className="min-w-0 cursor-pointer truncate text-left font-semibold hover:underline"
                            >
                              {stakeholder.name}
                            </button>
                          ) : (
                            <span className="truncate text-fg-muted">
                              Persona non in configurazione
                            </span>
                          )}
                          {team && <span className="shrink-0 text-fg-muted">{team.tag}</span>}
                        </div>
                        <div
                          className="pointer-events-none relative"
                          style={{ gridColumn: 2, gridRow, minHeight: personRowHeight }}
                        >
                          <AssignmentBar
                            assignment={moving}
                            schedule={schedule}
                            stakeholder={stakeholder}
                            team={team}
                            range={range}
                            dayWidth={dayWidth}
                            height={assignmentHeight}
                            overflowTitle={oneLineTitles}
                            dragging={personDrag.drag?.assignment.id === assignment.id}
                            describedBy={assignmentHelpId}
                            onPointerDown={(event) => personDrag.startDrag(event, assignment)}
                            onOpen={() => {
                              if (!personDrag.isClickAfterDrag()) onOpenAssignment(assignment);
                            }}
                            onChange={(changes) => changeAssignmentByKey(assignment, changes)}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {level === 'team' && !searching && (
                    <>
                      <div
                        className={`${LABEL_CELL} flex items-center border-t border-line/60 bg-surface-muted`}
                        style={{ gridColumn: 1, gridRow: rows, minHeight: personRowHeight }}
                      >
                        <button
                          type="button"
                          onClick={() => onAddAssignment(project)}
                          className="flex cursor-pointer items-center gap-1 text-xs font-medium text-link hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          Persona
                          <span className="sr-only"> che lavora a «{project.title}»</span>
                        </button>
                      </div>
                      <div style={{ gridColumn: 2, gridRow: rows }} />
                    </>
                  )}
                </div>
              );
            })}

            {searching ? (
              projects.length === 0 && (
                <p className="sticky left-0 w-fit px-4 py-3 text-xs text-fg-muted">
                  Nessun progetto con questo testo.
                </p>
              )
            ) : (
              <div className="grid" style={rowStyle}>
                <div
                  className={`${LABEL_CELL} flex flex-col justify-center gap-0.5 bg-surface-muted text-xs text-fg-muted`}
                  style={{ gridColumn: 1, gridRow: 1, minHeight: projectRowHeight }}
                >
                  <span className="flex items-center gap-1 font-semibold">
                    <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {projects.length === 0 ? 'Nessun progetto' : 'Nuovo progetto'}
                  </span>
                  <span className="pointer-coarse:hidden">Clic su un giorno per crearne uno</span>
                  <span className="hidden pointer-coarse:inline">
                    Tocca un giorno per crearne uno
                  </span>
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
          {drag.kind === 'move' ? 'Sposta' : drag.kind === 'start' ? 'Inizio' : 'Fine'}{' '}
          <strong className="tabular-nums">
            {drag.days > 0 ? `+${drag.days}` : drag.days}{' '}
            {Math.abs(drag.days) === 1 ? 'giorno' : 'giorni'}
          </strong>
        </DragHint>
      )}
      {personDrag.drag && (
        <DragHint>
          Inizio del lavoro{' '}
          <strong>{formatDateToIT(draggedAssignment(personDrag.drag).startDate)}</strong>
        </DragHint>
      )}
    </div>
  );
}
