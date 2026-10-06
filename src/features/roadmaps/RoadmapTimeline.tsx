import { memo, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Plus, UserRound } from 'lucide-react';
import { applyChanges } from '../../domain/changes';
import type { ProjectChanges } from '../../domain/projects';
import type { DateRange } from '../../domain/schedule';
import type { Project } from '../../domain/types';
import { prefersReducedMotion } from '../../shared/motion';
import { Highlight } from '../../shared/ui/Highlight';
import { scaledTextStyle } from '../../shared/ui/textScale';
import type { TextScale } from '../../shared/ui/textScale';
import { useStableCallback } from '../../shared/useStableCallback';
import { diffDays, formatDateToIT } from '../../utils/dateUtils';
import { DragHint } from '../calendar/DragHint';
import { LABEL_CELL, clampLines } from '../calendar/timelineLayout';
import { ProjectBar, projectBarId } from './ProjectBar';
import { ProjectStatusMark } from './projectUi';
import type { ProjectDetail } from './projectUi';
import {
  ROADMAP_DAY_WIDTH,
  barPlace,
  projectPeriod,
  roadmapMetrics,
  yearSpans,
} from './roadmapLayout';
import type { RoadmapColumn, RoadmapZoom } from './roadmapLayout';
import { draggedProject, useProjectDrag } from './useProjectDrag';
import { useRoadmapScroll } from './useRoadmapScroll';

interface RoadmapTimelineProps {
  /** The projects to show, one per row, in the order of the rows. */
  projects: Project[];
  range: DateRange;
  columns: RoadmapColumn[];
  zoom: RoadmapZoom;
  today: string;
  /** A new value brings today into view. */
  todayRequest: number;
  /** What each row shows beside the title of its project. */
  details: readonly ProjectDetail[];
  /** While searching, the rows are those found, and no row adds a project. */
  searching: boolean;
  textScale: TextScale;
  compact: boolean;
  onOpen: (project: Project) => void;
  /** Adds a project over a month, or a quarter. */
  onAddAt: (column: RoadmapColumn) => void;
  onChange: (projectId: string, changes: ProjectChanges) => void;
}

/** The columns of a row, the past ones grey: memoized, since a drag redraws only the bars. */
const RowCells = memo(function RowCells({
  columns,
  onAdd,
}: {
  columns: RoadmapColumn[];
  /** Clicking a column adds a project there, in the row that adds them. */
  onAdd?: (column: RoadmapColumn) => void;
}) {
  return columns.map((column) => (
    <div
      key={column.start}
      onClick={onAdd && (() => onAdd(column))}
      title={onAdd ? `Nuovo progetto: ${column.name}` : undefined}
      style={{ width: column.width }}
      className={`flex shrink-0 items-center justify-center border-r ${
        column.yearEnd ? 'border-line-strong' : 'border-line'
      } ${column.past ? 'bg-past' : ''} ${
        // The plus is drawn by CSS: one icon element per column would weigh on long roadmaps.
        onAdd
          ? "cursor-pointer text-base text-link after:opacity-0 after:content-['+'] hover:bg-accent-soft hover:after:opacity-100 pointer-coarse:after:hidden"
          : ''
      }`}
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

/** The title of a project and the details chosen for the rows. */
function ProjectInfo({
  project,
  details,
  onOpen,
}: {
  project: Project;
  details: readonly ProjectDetail[];
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
      {details.includes('dates') && (
        <span
          className="text-xs text-fg-muted"
          title={`${formatDateToIT(project.startDate)} → ${formatDateToIT(project.endDate)}`}
        >
          {projectPeriod(project)}
        </span>
      )}
      {details.includes('status') && (
        <span className="text-xs">
          <ProjectStatusMark status={project.status} />
        </span>
      )}
      {details.includes('owner') && project.owner && (
        <span className="flex items-center gap-1 text-xs">
          <UserRound className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">
            <Highlight text={project.owner} />
          </span>
        </span>
      )}
      {details.includes('description') && project.description && (
        <span style={clampLines(3)} className="text-xs whitespace-pre-line text-fg-muted">
          <Highlight text={project.description} />
        </span>
      )}
    </>
  );
}

/**
 * The roadmap: a row for each project, past, current or to come, with a bar from its start to its
 * end, over months or quarters that scroll sideways. The last row adds a project with a click on
 * a month.
 */
export function RoadmapTimeline({
  projects,
  range,
  columns,
  zoom,
  today,
  todayRequest,
  details,
  searching,
  textScale,
  compact,
  onOpen,
  onAddAt,
  onChange,
}: RoadmapTimelineProps) {
  const dayWidth = ROADMAP_DAY_WIDTH[zoom];
  const { barHeight, rowPadding, labelWidth } = roadmapMetrics(textScale, compact);
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const todayLeft =
    range.start <= today && today <= range.end
      ? (diffDays(range.start, today) + 0.5) * dayWidth
      : null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const helpId = useId();
  const { drag, startDrag, isClickAfterDrag } = useProjectDrag(dayWidth, onChange);
  useRoadmapScroll(scrollRef, range, dayWidth, today, todayRequest);

  const addAt = useStableCallback(onAddAt);
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

  return (
    <div className="w-full bg-surface select-none">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <p id={helpId} className="sr-only">
        Frecce sinistra e destra spostano il progetto di una settimana; con Maiusc cambiano la data
        di fine. Invio lo apre.
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
        className="relative w-full touch-pan-x touch-pan-y overflow-x-auto [overflow-anchor:none]"
      >
        <div style={{ width: `calc(var(--gantt-label-width) + ${totalWidth}px)` }}>
          <div className="flex border-b border-line bg-surface text-xs">
            <div className={`${LABEL_CELL} flex items-center bg-surface font-bold uppercase`}>
              Anno
            </div>
            <div className="relative flex">
              {yearSpans(range, dayWidth).map((span) => (
                // Clipped, not hidden: a hidden overflow would make the cell the sticky container.
                <div
                  key={span.year}
                  style={{ width: span.width }}
                  className="shrink-0 overflow-clip border-r border-line-strong py-1.5 in-data-compact:py-1"
                >
                  <span className="sticky left-(--gantt-label-width) px-2 font-bold">
                    {span.year}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex border-b border-line-strong text-xs">
            <div className={`${LABEL_CELL} flex items-center bg-surface font-bold uppercase`}>
              {zoom === 'years' ? 'Trimestre' : 'Mese'}
            </div>
            {columns.map((column) => (
              <div
                key={column.start}
                title={`${column.name}${column.current ? ' · in corso' : ''}`}
                style={{ width: column.width }}
                className={`shrink-0 truncate border-r py-1 text-center in-data-compact:py-0.5 ${
                  column.yearEnd ? 'border-line-strong' : 'border-line'
                } ${
                  column.past
                    ? 'bg-past text-fg-muted'
                    : column.current
                      ? 'bg-accent-soft font-bold text-link underline decoration-2 underline-offset-4'
                      : ''
                }`}
              >
                {column.label}
                {column.current && <span className="sr-only">, in corso</span>}
              </div>
            ))}
          </div>

          <div className="relative divide-y divide-line">
            {todayLeft !== null && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 z-0 w-0.5 -translate-x-1/2 bg-link"
                style={{ left: `calc(var(--gantt-label-width) + ${todayLeft}px)` }}
              />
            )}

            {projects.map((project) => {
              const shown = drag?.project.id === project.id ? draggedProject(drag) : project;
              const { left, width } = barPlace(shown, range, dayWidth);
              return (
                <div
                  key={project.id}
                  className="flex"
                  style={{ minHeight: barHeight + rowPadding * 2 }}
                >
                  <div
                    className={`${LABEL_CELL} flex flex-col justify-center gap-0.5 bg-surface-muted`}
                  >
                    <ProjectInfo
                      project={project}
                      details={details}
                      onOpen={() => onOpen(project)}
                    />
                  </div>
                  <div className="relative flex">
                    <RowCells columns={columns} />
                    <div className="pointer-events-none absolute inset-0">
                      <ProjectBar
                        project={shown}
                        left={left + 1}
                        width={width - 2}
                        top={`calc(50% - ${barHeight / 2}px)`}
                        height={barHeight}
                        dragging={drag?.project.id === project.id}
                        describedBy={helpId}
                        onPointerDown={(event, kind) => startDrag(event, project, kind)}
                        onOpen={() => {
                          if (!isClickAfterDrag()) onOpen(project);
                        }}
                        onChange={(changes) => changeByKey(project, changes)}
                      />
                    </div>
                  </div>
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
              <div className="flex" style={{ minHeight: barHeight + rowPadding * 2 }}>
                <div
                  className={`${LABEL_CELL} flex flex-col justify-center gap-0.5 bg-surface-muted text-xs text-fg-muted`}
                >
                  <span className="flex items-center gap-1 font-semibold">
                    <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {projects.length === 0 ? 'Nessun progetto' : 'Nuovo progetto'}
                  </span>
                  <span className="pointer-coarse:hidden">Clic su un mese per crearne uno</span>
                  <span className="hidden pointer-coarse:inline">
                    Tocca un mese per crearne uno
                  </span>
                </div>
                <div className="relative flex">
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
    </div>
  );
}
