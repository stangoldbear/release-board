import type { DragEvent, PointerEvent } from 'react';
import { CalendarRange, GripVertical, Plus, TriangleAlert, UserRound } from 'lucide-react';
import type { ProjectChanges, ProjectWithEnd } from '../../domain/projects';
import type { ProjectSpan } from '../../domain/projectSpan';
import { projectColorOf } from '../../domain/roadmapConfig';
import { placeTasks } from '../../domain/schedule';
import type { DateRange } from '../../domain/schedule';
import type {
  Assignment,
  Milestone,
  ProjectField,
  RoadmapConfig,
  Stakeholder,
} from '../../domain/types';
import { prefersReducedMotion } from '../../shared/motion';
import { useFormatDate } from '../../shared/dateFormat';
import { Highlight } from '../../shared/ui/Highlight';
import { diffDays } from '../../utils/dateUtils';
import { LABEL_CELL, clampLines } from '../calendar/timelineLayout';
import type { Column } from '../calendar/timelineLayout';
import type { DragKind } from '../calendar/useTaskDrag';
import { projectBarHeight } from './barRendering';
import type { BarRendering, WorkItem } from './barRendering';
import { DaysEditor } from './DaysEditor';
import { FieldValues } from './fieldUi';
import { ProjectBar, projectBarId } from './ProjectBar';
import { DETAIL_LEVELS, ProjectStatusMark } from './projectUi';
import type { DetailLevel } from './projectUi';
import { projectPeriod } from './roadmapLayout';
import type { RoadmapMetrics } from './roadmapLayout';
import { RowCells } from './RowCells';
import { draggedProject } from './useProjectDrag';
import type { ProjectDrag } from './useProjectDrag';
import { draggedWork } from './useWorkDrag';
import type { WorkChanges, WorkDrag, WorkDragKind } from './useWorkDrag';
import { WorkBar, workBarId } from './WorkBar';
import { MilestoneLayer } from './MilestoneDiamond';
import type { MilestoneTools } from './MilestoneDiamond';
import { useStableCallback } from '../../shared/useStableCallback';

/** The bar whose days are being typed: the project itself, or a bar of its work. */
export interface Editing {
  kind: 'project' | 'assignment' | 'contingency';
  /** The id of the project, or of the assignment. */
  id: string;
}

const ROW_STYLE = { gridTemplateColumns: 'var(--gantt-label-width) auto' };
/** The least width of the field that types the days of a bar. */
const EDITOR_MIN_WIDTH = 88;

/** Brings the bar of a project into view, past or future as it may be. */
function showBar(projectId: string): void {
  document.getElementById(projectBarId(projectId))?.scrollIntoView({
    inline: 'center',
    block: 'nearest',
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
}

/**
 * The title of a project and, from the "Info principali" level on, what describes it: a line in
 * grey with state, months and owner, each with its icon, the description cut short, and, set
 * apart, the main fields.
 */
function ProjectInfo({
  project,
  level,
  fields,
  hiddenFieldId,
  descriptionLines,
  onOpen,
}: {
  project: ProjectWithEnd;
  level: DetailLevel;
  fields: readonly ProjectField[];
  /** The field the rows are grouped by: the header of the group already says its value. */
  hiddenFieldId: string | undefined;
  descriptionLines: number;
  onOpen: () => void;
}) {
  const formatDate = useFormatDate();
  const mainFields = fields.filter((field) => field.main && field.id !== hiddenFieldId);
  return (
    <>
      {/*
        Out of the tab order: the bar is the project for the keyboard. A click opens the project,
        as on the bar, and brings the bar into view behind the window: it may be far in the past
        or in the future. The room on the right is for the buttons of the rows.
      */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          showBar(project.id);
          onOpen();
        }}
        title="Apri il progetto"
        className="cursor-pointer text-left text-xs leading-snug font-bold wrap-break-word hyphens-auto hover:underline sm:pr-[72px]"
      >
        <Highlight text={project.title} />
      </button>
      {level !== 'titles' && (
        <>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-muted">
            <ProjectStatusMark status={project.status} />
            <span
              className="inline-flex items-center gap-1 whitespace-nowrap"
              title={`${formatDate(project.startDate)} → ${formatDate(project.endDate)}`}
            >
              <CalendarRange className="h-3 w-3 shrink-0" aria-hidden="true" />
              {projectPeriod(project)}
            </span>
            {project.owner && (
              <span className="flex min-w-0 items-center gap-1">
                <UserRound className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="sr-only">responsabile </span>
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
              title={project.description}
            >
              <Highlight text={project.description} />
            </span>
          )}
          {mainFields.length > 0 && (
            <span className="mt-1 flex flex-col gap-1">
              {mainFields.map((field) => (
                <FieldValues key={field.id} project={project} field={field} />
              ))}
            </span>
          )}
        </>
      )}
    </>
  );
}

/**
 * The rows of one project, one, two or three: the same choice as «Informazioni visibili» at the
 * bottom, for this project alone. The choice of the roadmap is not an exception.
 */
function LevelButtons({
  title,
  level,
  defaultLevel,
  teamLevelAvailable,
  onSetLevel,
}: {
  title: string;
  level: DetailLevel;
  defaultLevel: DetailLevel;
  teamLevelAvailable: boolean;
  onSetLevel: (level: DetailLevel | null) => void;
}) {
  return (
    <span
      role="group"
      aria-label={`Righe di «${title}»`}
      // On a phone the column is narrow: the buttons follow the title instead of floating beside it.
      className="mt-0.5 flex items-center gap-0.5 self-end rounded-md border border-line bg-surface p-px opacity-70 transition-opacity group-hover/row:opacity-100 hover:opacity-100 focus-within:opacity-100 sm:absolute sm:top-1 sm:right-1 sm:mt-0"
    >
      {DETAIL_LEVELS.map((option) => {
        const Icon = option.icon;
        const pressed = level === option.id;
        const disabled = option.id === 'team' && !teamLevelAvailable;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={pressed}
            aria-disabled={disabled || undefined}
            aria-label={option.label}
            title={
              disabled
                ? 'Servono le regole di sicurezza aggiornate per il livello Team'
                : `${option.label}: ${option.rows} ${option.rows === 1 ? 'riga' : 'righe'} per questo progetto`
            }
            onClick={() => {
              if (!disabled) onSetLevel(option.id === defaultLevel ? null : option.id);
            }}
            className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-sm ${
              pressed ? 'bg-surface-strong text-fg' : 'text-fg-muted hover:text-fg'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </span>
  );
}

export interface ProjectRowProps {
  project: ProjectWithEnd;
  span: ProjectSpan;
  /** The bars of the work of the project, in the order of the work. */
  work: WorkItem[];
  /** The assignments of the project, to open the window of one. */
  assignments: Assignment[];
  /** How much this row shows, and what the roadmap shows: the buttons of the row mark its own choice. */
  level: DetailLevel;
  defaultLevel: DetailLevel;
  teamLevelAvailable: boolean;
  rendering: BarRendering;
  columns: Column[];
  totalWidth: number;
  todayOffset: number | null;
  range: DateRange;
  dayWidth: number;
  metrics: RoadmapMetrics;
  oneLineTitles: boolean;
  searching: boolean;
  config: RoadmapConfig;
  groupBy: ProjectField | null;
  projectDrag: ProjectDrag | null;
  workDrag: WorkDrag | null;
  editing: Editing | null;
  helpId: string;
  workHelpId: string;
  ignoreProjectClick: () => boolean;
  ignoreWorkClick: () => boolean;
  onStartProjectDrag: (event: PointerEvent, project: ProjectWithEnd, kind: DragKind) => void;
  onStartWorkDrag: (event: PointerEvent, item: WorkItem, kind: WorkDragKind) => void;
  onEdit: (editing: Editing | null) => void;
  onOpen: () => void;
  onChange: (changes: ProjectChanges) => void;
  onMove: (days: number) => void;
  onChangeWork: (item: WorkItem, changes: WorkChanges) => void;
  onOpenAssignment: (assignment: Assignment) => void;
  onAddAssignment: () => void;
  onOpenStakeholder: (stakeholder: Stakeholder) => void;
  onSetLevel: (level: DetailLevel | null) => void;
  /** The row dragged in the column of the projects, and where a dragged row would land. */
  dragSource: { onDragStart: (event: DragEvent) => void; onDragEnd: () => void };
  dragTarget: {
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent) => void;
  };
  dropBefore: boolean;
  dropAfter: boolean;
  rowDragging: boolean;
  /** Moves the project up or down by a row, from the keyboard. */
  onMoveRow: (delta: -1 | 1) => void;
  /** The notes on the timeline of the project, and what every diamond shares. */
  milestones: Milestone[];
  milestoneTools: MilestoneTools;
  /** Adds a note of the project on a day, with a click on it; absent while searching. */
  onAddMilestone?: (date: string) => void;
}

/**
 * The row of a project: its name and what describes it in the column, its bar over the days with
 * the hard deadline as a dashed red line, and at the "Team" level a row for each bar of the work,
 * the people in the color of their team and the contingency in grey, with a row that adds a
 * person.
 */
export function ProjectRow({
  project,
  span,
  work,
  assignments,
  level,
  defaultLevel,
  teamLevelAvailable,
  rendering,
  columns,
  totalWidth,
  todayOffset,
  range,
  dayWidth,
  metrics,
  oneLineTitles,
  searching,
  config,
  groupBy,
  projectDrag,
  workDrag,
  editing,
  helpId,
  workHelpId,
  ignoreProjectClick,
  ignoreWorkClick,
  onStartProjectDrag,
  onStartWorkDrag,
  onEdit,
  onOpen,
  onChange,
  onMove,
  onChangeWork,
  onOpenAssignment,
  onAddAssignment,
  onOpenStakeholder,
  onSetLevel,
  dragSource,
  dragTarget,
  dropBefore,
  dropAfter,
  rowDragging,
  onMoveRow,
  milestones,
  milestoneTools,
  onAddMilestone,
}: ProjectRowProps) {
  const formatDate = useFormatDate();
  // Stable, so that the memoized cells of the row are not redrawn by every drag.
  const addNoteAt = useStableCallback((date: string) => onAddMilestone?.(date));
  const noteTitle = useStableCallback(
    (date: string) => `Nuova nota sulla timeline il ${formatDate(date)}`,
  );
  const { barHeight, assignmentHeight, rowPadding, laneHeight } = metrics;
  const shown = projectDrag?.project.id === project.id ? draggedProject(projectDrag) : project;
  const placed = placeTasks([shown], range).placed[0];
  const people = level === 'team' ? work : [];
  const rows = 1 + people.length + (level === 'team' && !searching ? 1 : 0);
  const height = projectBarHeight(rendering, barHeight, laneHeight, work.length);
  const projectRowHeight = height + rowPadding * 2;
  const personRowHeight = assignmentHeight + rowPadding;
  const colorId = projectColorOf(project, config);
  const deadlineLeft =
    project.deadline && project.deadline >= range.start && project.deadline <= range.end
      ? (diffDays(range.start, project.deadline) + 1) * dayWidth
      : null;
  const focusBack = (id: string) =>
    window.requestAnimationFrame(() => document.getElementById(id)?.focus());
  const isDragged = (item: WorkItem) =>
    workDrag?.item.id === item.id && workDrag.item.kind === item.kind;
  const isEdited = (item: WorkItem) => editing?.kind === item.kind && editing.id === item.id;

  const dropLine = dropBefore ? 'top-0' : dropAfter ? 'bottom-0' : null;

  return (
    <div
      className={`relative grid border-b border-line ${rowDragging ? 'opacity-50' : ''}`}
      style={ROW_STYLE}
      {...dragTarget}
    >
      {dropLine && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 z-[2] h-0.5 bg-link ${dropLine}`}
        />
      )}
      <div
        className="relative flex"
        style={{ gridColumn: 2, gridRow: `1 / span ${rows}`, width: totalWidth }}
      >
        <RowCells
          columns={columns}
          onAdd={onAddMilestone ? addNoteAt : undefined}
          addTitle={noteTitle}
        />
        {todayOffset !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-link"
            style={{ left: todayOffset }}
          />
        )}
        {deadlineLeft !== null && project.deadline && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 border-l-2 border-dashed border-danger"
              style={{ left: deadlineLeft - 1 }}
            />
            {span.late && (
              <span
                role="img"
                aria-label={`Il lavoro supera la hard deadline del ${formatDate(project.deadline)}`}
                title={`Il lavoro supera la hard deadline del ${formatDate(project.deadline)}`}
                className="absolute top-1 z-[2] -translate-x-1/2 rounded-full bg-surface p-px text-danger shadow-xs"
                style={{ left: deadlineLeft }}
              >
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            )}
          </>
        )}
      </div>

      <div
        className={`${LABEL_CELL} group/row flex flex-col justify-center gap-0.5 bg-surface-muted pl-5`}
        style={{ gridColumn: 1, gridRow: 1, minHeight: projectRowHeight }}
        draggable
        {...dragSource}
      >
        {/* The grip says the row can be dragged; the keys and the window move it as well. */}
        <span
          aria-hidden="true"
          title="Trascina per cambiare l'ordine"
          className="absolute top-1/2 left-0.5 -translate-y-1/2 cursor-grab text-fg-muted opacity-50 group-hover/row:opacity-100"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
        <ProjectInfo
          project={project}
          level={level}
          fields={config.fields}
          hiddenFieldId={groupBy?.id}
          descriptionLines={metrics.descriptionLines}
          onOpen={onOpen}
        />
        <LevelButtons
          title={project.title}
          level={level}
          defaultLevel={defaultLevel}
          teamLevelAvailable={teamLevelAvailable}
          onSetLevel={onSetLevel}
        />
      </div>
      <div
        className="pointer-events-none relative"
        style={{ gridColumn: 2, gridRow: 1, minHeight: projectRowHeight }}
      >
        {placed && (
          <ProjectBar
            placed={placed}
            span={span}
            work={work}
            colorId={colorId}
            rendering={rendering}
            range={range}
            dayWidth={dayWidth}
            top={`calc(50% - ${height / 2}px)`}
            titleHeight={barHeight}
            height={height}
            laneHeight={laneHeight}
            resizableStart={work.length === 0}
            overflowTitle={oneLineTitles}
            dragging={projectDrag?.project.id === project.id}
            describedBy={helpId}
            ignoreClick={ignoreProjectClick}
            onPointerDown={(event, kind) => onStartProjectDrag(event, project, kind)}
            onOpen={onOpen}
            onEditDays={
              work.length === 0 ? () => onEdit({ kind: 'project', id: project.id }) : undefined
            }
            onChange={onChange}
            onMove={onMove}
            onMoveRow={onMoveRow}
          />
        )}
        <MilestoneLayer
          milestones={milestones}
          range={range}
          dayWidth={dayWidth}
          top="50%"
          tools={milestoneTools}
        />
        {placed && editing?.kind === 'project' && editing.id === project.id && (
          <DaysEditor
            value={project.manDays ?? 0}
            label={`Giorni uomo di «${project.title}»`}
            style={{
              left: placed.first * dayWidth + 1,
              top: `calc(50% - ${barHeight / 2}px)`,
              height: barHeight,
              minWidth: EDITOR_MIN_WIDTH,
            }}
            onSave={(manDays) => {
              onChange({ manDays });
              onEdit(null);
              focusBack(projectBarId(project.id));
            }}
            onCancel={() => {
              onEdit(null);
              focusBack(projectBarId(project.id));
            }}
          />
        )}
      </div>

      {people.map((item, index) => {
        const moving = isDragged(item) && workDrag ? draggedWork(workDrag) : item;
        const gridRow = index + 2;
        return (
          <div key={`${item.kind}-${item.id}`} className="contents">
            <div
              className={`${LABEL_CELL} flex items-center gap-1.5 border-t border-line/60 bg-surface-muted text-xs`}
              style={{ gridColumn: 1, gridRow, minHeight: personRowHeight }}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full border border-line-strong"
                style={{
                  backgroundColor: item.colorId
                    ? `var(--rb-task-${item.colorId}-border)`
                    : 'var(--color-surface-strong)',
                }}
              />
              {item.stakeholder ? (
                <button
                  type="button"
                  onClick={() => onOpenStakeholder(item.stakeholder!)}
                  title="Modifica la persona: nome, team, info e assenze"
                  className="min-w-0 cursor-pointer truncate text-left font-semibold hover:underline"
                >
                  {item.name}
                </button>
              ) : item.kind === 'contingency' ? (
                <button
                  type="button"
                  onClick={onOpen}
                  title="Apri il progetto: la contingency è nella tabella dei giorni"
                  className="min-w-0 cursor-pointer truncate text-left font-semibold hover:underline"
                >
                  {item.name}
                </button>
              ) : (
                <span className="truncate text-fg-muted">{item.name}</span>
              )}
              {item.tag && <span className="shrink-0 text-fg-muted">{item.tag}</span>}
            </div>
            <div
              className="pointer-events-none relative"
              style={{ gridColumn: 2, gridRow, minHeight: personRowHeight }}
            >
              <WorkBar
                item={moving}
                range={range}
                dayWidth={dayWidth}
                height={assignmentHeight}
                overflowTitle={oneLineTitles}
                dragging={isDragged(item)}
                describedBy={workHelpId}
                ignoreClick={ignoreWorkClick}
                onPointerDown={(event, kind) => onStartWorkDrag(event, item, kind)}
                onOpen={() => {
                  if (item.kind === 'contingency') {
                    onOpen();
                    return;
                  }
                  const assignment = assignments.find((entry) => entry.id === item.id);
                  if (assignment) onOpenAssignment(assignment);
                }}
                onEditDays={() => onEdit({ kind: item.kind, id: item.id })}
                onChange={(changes) => onChangeWork(item, changes)}
              />
              {isEdited(item) && (
                <DaysEditor
                  value={item.manDays}
                  label={`Giorni uomo di ${item.name}`}
                  style={{
                    left: Math.max(0, diffDays(range.start, item.schedule.start)) * dayWidth + 1,
                    top: `calc(50% - ${assignmentHeight / 2}px)`,
                    height: assignmentHeight,
                    minWidth: EDITOR_MIN_WIDTH,
                  }}
                  onSave={(manDays) => {
                    onChangeWork(item, { manDays });
                    onEdit(null);
                    focusBack(workBarId(item));
                  }}
                  onCancel={() => {
                    onEdit(null);
                    focusBack(workBarId(item));
                  }}
                />
              )}
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
              onClick={onAddAssignment}
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
}
