import type { CSSProperties, DragEvent, PointerEvent } from 'react';
import { Flag, GripVertical, Info, UserPlus } from 'lucide-react';
import { Tooltip } from '../../shared/ui/Tooltip';
import type { TaskColorId } from '../../domain/colors';
import type { ProjectChanges, ProjectWithEnd } from '../../domain/projects';
import type { ProjectSpan } from '../../domain/projectSpan';
import type { ProjectOfDay } from '../../domain/projectStatus';
import { coloredValueOf, projectColorOf } from '../../domain/roadmapConfig';
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
import { useStableCallback } from '../../shared/useStableCallback';
import { diffDays } from '../../utils/dateUtils';
import { LABEL_CELL } from '../calendar/timelineLayout';
import type { Column } from '../calendar/timelineLayout';
import { formatManDays, groupWorkItems, peopleRows, projectRowGeometry } from './barRendering';
import type { WorkItem } from './barRendering';
import { DaysEditor } from './DaysEditor';
import { DeadlineSign } from './DeadlineSign';
import { FieldTag } from './fieldUi';
import { deadlineOverrun } from './deadlineOverrun';
import { MilestoneLayer } from './MilestoneDiamond';
import type { MilestoneTools } from './MilestoneDiamond';
import { ProjectBar, projectBarId } from './ProjectBar';
import { DETAIL_LEVELS, ProjectStatusMark } from './projectUi';
import type { DetailLevel } from './projectUi';
import type { RoadmapMetrics } from './roadmapLayout';
import { RowCells } from './RowCells';
import { StatusChangeSign } from './StatusChangeSign';
import { draggedProject } from './useProjectDrag';
import type { ProjectDrag } from './useProjectDrag';
import { draggedWork } from './useWorkDrag';
import type { WorkChanges, WorkDrag, WorkDragKind } from './useWorkDrag';
import { WorkBar, workBarId } from './WorkBar';
import { workSplitParts } from './useWorkSplit';

/** The bar of the work whose days are being typed. */
export interface Editing {
  kind: 'assignment' | 'contingency';
  /** The id of the assignment; for the contingency, the id of the project. */
  id: string;
}

const ROW_STYLE = { gridTemplateColumns: 'var(--gantt-label-width) auto' };
/** With the people in rows, room under the last one for the edge of the bar around them. */
const ROOM_UNDER_THE_PEOPLE = 4;
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

/** Where a piece of the rail of a project is: alone, at the top, in the middle or at the end. */
type RailPart = 'only' | 'first' | 'middle' | 'last';

const RAIL_PART: Record<RailPart, string> = {
  only: 'top-1 bottom-1 rounded-full',
  first: 'top-1 bottom-0 rounded-t-full',
  // Over the line between two rows, so that the rail runs on unbroken.
  middle: '-top-px bottom-0',
  last: '-top-px bottom-1 rounded-b-full',
};

/**
 * The piece of the rail of a project in one cell of the column, in the color of its bar: alone in
 * the cell of the title, or with the people in rows down the left edge from the title to the last
 * person, so that the block reads as one. The words are the tag beside the title.
 */
function RailPiece({ colorId, part }: { colorId: TaskColorId; part: RailPart }) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: `var(--rb-task-${colorId}-border)` }}
      className={`absolute left-4 w-1 ${RAIL_PART[part]}`}
    />
  );
}

/**
 * With the people in rows the names of a project are a rectangle: the color of its bar at a quarter over
 * the surface below, with an edge in the color of the bar. Over the days only the bar has the
 * color of the project: the days before its start and after its end stay as the grid draws them.
 */
function blockTint(colorId: TaskColorId, over: string): string {
  return `color-mix(in srgb, var(--rb-task-${colorId}-bg) 25%, ${over})`;
}
function blockEdge(colorId: TaskColorId): string {
  return `color-mix(in srgb, var(--rb-task-${colorId}-border) 60%, transparent)`;
}

/**
 * The cell of the names of a row of the block: its tint, and the edges of the rectangle on its
 * left and, at the top and at the bottom of the block, above or below it.
 */
function blockCellStyle(colorId: TaskColorId, top: boolean, bottom: boolean): CSSProperties {
  const edge = blockEdge(colorId);
  return {
    '--block-tint': blockTint(colorId, 'var(--color-surface-muted)'),
    boxShadow: [
      `inset 1px 0 0 ${edge}`,
      top ? `inset 0 1px 0 ${edge}` : null,
      bottom ? `inset 0 -1px 0 ${edge}` : null,
    ]
      .filter(Boolean)
      .join(', '),
  } as CSSProperties;
}

/** The left of the line of the tree, under the shape of the state of the project. */
const TREE_LINE = 'absolute left-[33px] w-px bg-line-strong';

/**
 * The tree from the title of a project to a person, in the cell of the person: the line down from
 * the person above, to the middle of the row for the last one, and a tick to the name.
 */
function TreeBranch({ last }: { last: boolean }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`${TREE_LINE} -top-px ${last ? 'h-[calc(50%+1px)]' : 'bottom-0'}`}
      />
      <span aria-hidden="true" className="absolute top-1/2 left-[33px] h-px w-2 bg-line-strong" />
    </>
  );
}

/** "Server #1 ServerSide · 20 gg": a person at work on a project, in words. */
function personLine(item: WorkItem, manDays: number): string {
  return `${item.name}${item.tag ? ` ${item.tag}` : ''} · ${formatManDays(manDays)}`;
}

/**
 * The tools of the row of a project, under the mouse and the focus: first the button that shows
 * everything about the project in a small window, then, with the people in rows, a button that
 * adds a person, then the rows of the project, one, two or three, the same choice as «Informazioni
 * visibili» at the top, for this project alone. The choice of the timeline is not an exception.
 */
function LevelButtons({
  title,
  level,
  defaultLevel,
  teamLevelAvailable,
  infoOpen,
  onShowInfo,
  onSetLevel,
  onAddPerson,
}: {
  title: string;
  level: DetailLevel;
  defaultLevel: DetailLevel;
  teamLevelAvailable: boolean;
  /** The window with the details of this project is open. */
  infoOpen: boolean;
  /** Opens or closes the window with the details, beside the tools of the row. */
  onShowInfo: (button: HTMLElement, tools: HTMLElement) => void;
  onSetLevel: (level: DetailLevel | null) => void;
  /** Adds a person to the project; absent where the people are not shown. */
  onAddPerson?: () => void;
}) {
  return (
    <span
      className={`absolute top-0.5 right-1 flex items-center gap-0.5 rounded-md border border-line bg-surface p-px transition-opacity group-hover/row:opacity-100 hover:opacity-100 focus-within:opacity-100 ${
        infoOpen ? 'opacity-100' : 'opacity-0 pointer-coarse:opacity-70'
      }`}
    >
      <button
        type="button"
        onClick={(event) => {
          const tools = event.currentTarget.parentElement;
          if (tools) onShowInfo(event.currentTarget, tools);
        }}
        aria-label={`Informazioni su «${title}»`}
        aria-expanded={infoOpen}
        title="Informazioni sul progetto"
        className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-sm text-link hover:bg-accent-soft ${
          infoOpen ? 'bg-accent-soft' : ''
        }`}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-line" />
      {onAddPerson && (
        <>
          <button
            type="button"
            onClick={onAddPerson}
            aria-label={`Aggiungi una persona a «${title}»`}
            title="Aggiungi una persona che lavora al progetto"
            className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-sm text-link hover:bg-accent-soft"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-line" />
        </>
      )}
      <span role="group" aria-label={`Righe di «${title}»`} className="flex items-center gap-0.5">
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
    </span>
  );
}

export interface ProjectRowProps {
  project: ProjectOfDay<ProjectWithEnd>;
  today: string;
  span: ProjectSpan;
  /** The bars of the work of the project, in the order of the teams. */
  work: WorkItem[];
  /** The assignments of the project, to open the window of one. */
  assignments: Assignment[];
  /** How much this row shows, and what the timeline shows: the buttons of the row mark its own choice. */
  level: DetailLevel;
  defaultLevel: DetailLevel;
  teamLevelAvailable: boolean;
  columns: Column[];
  totalWidth: number;
  todayOffset: number | null;
  range: DateRange;
  dayWidth: number;
  metrics: RoadmapMetrics;
  searching: boolean;
  config: RoadmapConfig;
  /** The field whose value tags the project beside its title, whatever colors the bars; null without one. */
  tagField: ProjectField | null;
  /** The window with everything about the project is open on this row. */
  infoOpen: boolean;
  /** Opens or closes that window, beside the tools of the row, from the button that asks for it. */
  onShowInfo: (button: HTMLElement, tools: HTMLElement) => void;
  projectDrag: ProjectDrag | null;
  workDrag: WorkDrag | null;
  editing: Editing | null;
  helpId: string;
  workHelpId: string;
  ignoreProjectClick: () => boolean;
  ignoreWorkClick: () => boolean;
  onStartProjectDrag: (event: PointerEvent, project: ProjectWithEnd) => void;
  onStartWorkDrag: (event: PointerEvent, item: WorkItem, kind: WorkDragKind) => void;
  onEdit: (editing: Editing | null) => void;
  onOpen: () => void;
  onDuplicate: (() => void) | undefined;
  onDuplicateWork: (item: WorkItem) => void;
  contingencyDuplicable: boolean;
  /** Opens the window that splits a bar of work in parts. */
  onSplitWork: (item: WorkItem) => void;
  /** Parts a block of contingency can make at most: the blocks the project can still take, plus it. */
  contingencySplitParts: number;
  onOpenContingency: (item: WorkItem) => void;
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
 * The row of a project: in the column, the rail in the color of its bar, the shape of its state,
 * its title and the tag of its size, with everything else in the card; its bar over the days, with
 * the deadline as a dashed red line; at «Info principali» and Team a row for each bar of the work
 * under the title, the people in the color of their team and the contingency in grey: thin rows
 * at «Info principali», roomier ones with the name on the bar at the Team level.
 */
export function ProjectRow({
  project,
  today,
  span,
  work,
  assignments,
  level,
  defaultLevel,
  teamLevelAvailable,
  columns,
  totalWidth,
  todayOffset,
  range,
  dayWidth,
  metrics,
  searching,
  config,
  tagField,
  infoOpen,
  onShowInfo,
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
  onDuplicate,
  onDuplicateWork,
  contingencyDuplicable,
  onSplitWork,
  contingencySplitParts,
  onOpenContingency,
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
  // The people in rows of their own, at «Info principali» and Team; none with the titles alone.
  const peopleRow = peopleRows(level, metrics);
  const personRowHeight = peopleRow?.rowHeight ?? 0;
  // The field that types the days of a person: a line of text tall, over a thin row as well.
  const editorHeight = Math.max(personRowHeight, metrics.lineHeight + 4);
  const shown = projectDrag?.project.id === project.id ? draggedProject(projectDrag) : project;
  const placed = placeTasks([shown], range).placed[0];
  const people = peopleRow ? groupWorkItems(work) : [];
  const rows = 1 + people.length;
  // The bar with its lanes, and the lines of the column: the row takes the taller.
  const geometry = projectRowGeometry(level, work.length, metrics);
  const projectRowHeight = geometry.rowHeight;
  const colorId = projectColorOf(project, config);
  // The tag keeps the color of its value, also when the colors of the bars are free.
  const sizeValue = tagField ? coloredValueOf(project, tagField) : null;
  const overrun = deadlineOverrun(project, span, work, config.closures ?? []);
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
  // The bar of the project: with the people in rows it reaches down around them, so that the bars
  // of the projects nearly touch; elsewhere it is in the row of its title.
  const encloses = people.length > 0;
  const rowHeightOf = (last: boolean) => personRowHeight + (last ? ROOM_UNDER_THE_PEOPLE : 0);
  const projectBar = placed && (
    <ProjectBar
      placed={placed}
      span={span}
      work={work}
      colorId={colorId}
      range={range}
      dayWidth={dayWidth}
      top={encloses ? 1 : `calc(50% - ${geometry.barHeight / 2}px)`}
      titleHeight={geometry.titleHeight}
      height={encloses ? 'calc(100% - 1px)' : geometry.barHeight}
      lanes={geometry.lanes}
      // The title on one line, as the titles alone have it, whoever chose the level.
      overflowTitle={level === 'titles'}
      dragging={projectDrag?.project.id === project.id}
      describedBy={helpId}
      ignoreClick={ignoreProjectClick}
      onPointerDown={(event) => onStartProjectDrag(event, project)}
      onOpen={onOpen}
      onShowInfo={(anchor) => onShowInfo(anchor, anchor)}
      onDuplicate={onDuplicate}
      onMove={onMove}
      onMoveRow={onMoveRow}
    />
  );

  return (
    <div
      className={`group/row relative grid border-b border-line ${rowDragging ? 'opacity-50' : ''}`}
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
        {/* The row under the mouse, name and days, so that a bar is matched to its project. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-link/5 opacity-0 transition-opacity group-hover/row:opacity-100"
        />
        {todayOffset !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-link"
            style={{ left: todayOffset }}
          />
        )}
        {deadlineLeft !== null && (
          <div
            aria-hidden="true"
            // Over the bars, under the sign: it shows which work goes past it.
            className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-dashed border-danger"
            style={{ left: deadlineLeft - 1 }}
          />
        )}
      </div>

      {/* The cell of the names: the details of the project open from the first of its buttons. */}
      <div
        // The grip and the rail take the left of the cell at every density.
        className={`${LABEL_CELL} flex flex-col justify-center overflow-hidden pr-2 pl-7 transition-colors group-hover/row:bg-surface-strong in-data-compact:pl-7 ${
          peopleRow ? 'bg-(--block-tint) py-1!' : 'bg-surface-muted'
        }`}
        style={{
          gridColumn: 1,
          gridRow: 1,
          height: projectRowHeight,
          ...(peopleRow ? blockCellStyle(colorId, true, people.length === 0) : undefined),
        }}
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
        <RailPiece colorId={colorId} part={people.length > 0 ? 'first' : 'only'} />
        {people.length > 0 && (
          <span aria-hidden="true" className={`${TREE_LINE} top-[calc(50%+7px)] bottom-0`} />
        )}
        {/*
          Out of the tab order: the bar is the project for the keyboard. A click opens the
          project, as on the bar, and brings the bar into view behind the window: it may be far
          in the past or in the future. The room on the right is for the buttons of the rows.
        */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            showBar(project.id);
            onOpen();
          }}
          // The tag takes the right, under the buttons of the rows.
          className="flex w-full max-w-full min-w-0 cursor-pointer items-center gap-1 text-left text-xs leading-snug font-bold hover:underline"
        >
          <ProjectStatusMark status={project.status} iconOnly />
          <span className="truncate">
            <Highlight text={project.title} />
          </span>
          {/* The value is a tag beside the title, as the rail has no words. */}
          {sizeValue && (
            <span aria-hidden="true" className="ml-auto flex max-w-[45%] shrink-0 pl-1 font-medium">
              <FieldTag colorId={sizeValue.colorId}>{sizeValue.label}</FieldTag>
            </span>
          )}
          {tagField && sizeValue && (
            <span className="sr-only">
              , {tagField.label} {sizeValue.label}
            </span>
          )}
        </button>
        <LevelButtons
          title={project.title}
          level={level}
          defaultLevel={defaultLevel}
          teamLevelAvailable={teamLevelAvailable}
          infoOpen={infoOpen}
          onShowInfo={onShowInfo}
          onSetLevel={onSetLevel}
          onAddPerson={peopleRow && !searching ? onAddAssignment : undefined}
        />
      </div>
      {/* With the people in rows the bar goes around their work, from the title down. */}
      {encloses && (
        <div
          className="pointer-events-none relative"
          style={{ gridColumn: 2, gridRow: `1 / span ${rows}` }}
        >
          {projectBar}
        </div>
      )}
      <div
        className="pointer-events-none relative"
        style={{ gridColumn: 2, gridRow: 1, height: projectRowHeight }}
      >
        {!encloses && projectBar}
        <MilestoneLayer
          milestones={milestones}
          range={range}
          dayWidth={dayWidth}
          top="50%"
          tools={milestoneTools}
        />
        {deadlineLeft !== null && project.deadline && (
          <div className="pointer-events-auto absolute top-0.5 z-30" style={{ left: deadlineLeft }}>
            <Tooltip text={`Deadline di «${project.title}»: ${formatDate(project.deadline)}`}>
              <button
                type="button"
                aria-label={`Traguardo di «${project.title}»: ${formatDate(project.deadline)}`}
                onClick={onOpen}
                className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-xs bg-surface text-fg ring-1 ring-line-strong"
              >
                <Flag className="h-4 w-4" aria-hidden="true" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-[5px] left-[7px] h-[6px] w-[7px]"
                  style={{
                    backgroundImage:
                      'conic-gradient(var(--color-fg) 25%, var(--color-surface) 0 50%, var(--color-fg) 0 75%, var(--color-surface) 0)',
                    backgroundSize: '4px 4px',
                  }}
                />
              </button>
            </Tooltip>
          </div>
        )}
        {/* Over the bar, on the day of the deadline: where the work goes past it. */}
        {overrun && deadlineLeft !== null && (
          <DeadlineSign
            title={project.title}
            overrun={overrun}
            left={deadlineLeft - 12}
            onOpen={onOpen}
          />
        )}
        {project.statusChange && todayOffset !== null && (
          <StatusChangeSign
            project={project}
            change={project.statusChange}
            today={today}
            left={todayOffset}
            onConfirm={() => onChange({ status: project.statusChange!.to })}
            onOpen={onOpen}
          />
        )}
      </div>

      {people.map((group, index) => {
        const item = group.items[0]!;
        const totalDays = group.items.reduce(
          (sum, entry) =>
            sum + (isDragged(entry) && workDrag ? draggedWork(workDrag).manDays : entry.manDays),
          0,
        );
        const gridRow = index + 2;
        const last = index === people.length - 1;
        const groupHeight = rowHeightOf(last) + (group.lines - 1) * personRowHeight;
        return (
          <div key={group.key} className="contents">
            {/*
              One line, under the title and in its rail: the person, the team and the days. At
              «Info principali» in «Compatta» the row is as thin as the bar, and the words shrink
              until they fit in it (the owner's choice), whole in the tip of the row.
            */}
            <div
              className={`${LABEL_CELL} flex items-center bg-(--block-tint) py-0! pl-11! text-xs ${
                peopleRow?.thin ? 'gap-1 overflow-hidden' : 'gap-1.5 border-t border-line/60'
              }`}
              style={{
                gridColumn: 1,
                gridRow,
                ...(peopleRow?.thin
                  ? {
                      height: groupHeight,
                      fontSize: personRowHeight,
                      lineHeight: `${personRowHeight}px`,
                    }
                  : { minHeight: groupHeight }),
                ...blockCellStyle(colorId, false, last),
              }}
              title={peopleRow?.thin ? personLine(item, totalDays) : undefined}
            >
              <RailPiece colorId={colorId} part={last ? 'last' : 'middle'} />
              <TreeBranch last={last} />
              <span
                aria-hidden="true"
                className={`shrink-0 rounded-full border border-line-strong ${
                  peopleRow?.thin ? 'h-1.5 w-1.5' : 'h-2 w-2'
                }`}
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
              {/* In a narrow column the tag gives way first: the name and the days stay. */}
              {item.tag && (
                <span className="min-w-0 shrink-[4] truncate text-fg-muted">{item.tag}</span>
              )}
              <span className="ml-auto shrink-0 pl-1 text-fg-muted tabular-nums">
                {formatManDays(totalDays)}
              </span>
            </div>
            <div
              className="pointer-events-none relative"
              style={{ gridColumn: 2, gridRow, minHeight: groupHeight }}
            >
              {group.placed.map(({ bar: item, line }) => {
                const moving = isDragged(item) && workDrag ? draggedWork(workDrag) : item;
                return (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="pointer-events-none absolute inset-x-0"
                    style={{ top: line * personRowHeight, height: personRowHeight }}
                  >
                    <WorkBar
                      item={moving}
                      range={range}
                      dayWidth={dayWidth}
                      height={personRowHeight}
                      barHeight={peopleRow?.barHeight ?? 0}
                      labeled={peopleRow?.labeled ?? false}
                      dragging={isDragged(item)}
                      describedBy={workHelpId}
                      ignoreClick={ignoreWorkClick}
                      onPointerDown={(event, kind) => onStartWorkDrag(event, item, kind)}
                      onOpen={() => {
                        if (item.kind === 'contingency') {
                          onOpenContingency(item);
                          return;
                        }
                        const assignment = assignments.find((entry) => entry.id === item.id);
                        if (assignment) onOpenAssignment(assignment);
                      }}
                      onEditDays={() => onEdit({ kind: item.kind, id: item.id })}
                      onChange={(changes) => onChangeWork(item, changes)}
                      onDuplicate={
                        item.kind === 'contingency' && !contingencyDuplicable
                          ? undefined
                          : () => onDuplicateWork(item)
                      }
                      onSplit={
                        workSplitParts(
                          item,
                          item.kind === 'contingency' ? contingencySplitParts : undefined,
                        ) >= 2
                          ? () => onSplitWork(item)
                          : undefined
                      }
                    />
                    {isEdited(item) && (
                      <DaysEditor
                        value={item.manDays}
                        label={`Giorni uomo di ${item.name}`}
                        style={{
                          left:
                            Math.max(0, diffDays(range.start, item.schedule.start)) * dayWidth + 1,
                          top: `calc(50% - ${editorHeight / 2}px)`,
                          height: editorHeight,
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
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
