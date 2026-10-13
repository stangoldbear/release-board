import { useRef } from 'react';
import type { CSSProperties, DragEvent, FocusEvent, PointerEvent } from 'react';
import { GripVertical, UserPlus } from 'lucide-react';
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
import { taskColorStyle } from '../../themes';
import { diffDays } from '../../utils/dateUtils';
import { LABEL_CELL } from '../calendar/timelineLayout';
import type { Column } from '../calendar/timelineLayout';
import type { DragKind } from '../calendar/useTaskDrag';
import { formatManDays, projectRowGeometry, teamsOf } from './barRendering';
import type { WorkItem } from './barRendering';
import { DaysEditor } from './DaysEditor';
import { DeadlineSign } from './DeadlineSign';
import { FieldTag } from './fieldUi';
import { deadlineOverrun } from './deadlineOverrun';
import { MilestoneLayer } from './MilestoneDiamond';
import type { MilestoneTools } from './MilestoneDiamond';
import { ProjectBar, projectBarId } from './ProjectBar';
import type { ProjectCardTools } from './ProjectCard';
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

/** The bar whose days are being typed: the project itself, or a bar of its work. */
export interface Editing {
  kind: 'project' | 'assignment' | 'contingency';
  /** The id of the project, or of the assignment. */
  id: string;
}

const ROW_STYLE = { gridTemplateColumns: 'var(--gantt-label-width) auto' };
/** At the Team level, room under the last person for the edge of the bar around them. */
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

/**
 * The tab on the left edge of the row: the value of the field that colors the projects, written
 * upwards in the color of the value, cut with an ellipsis when the row is too short for it; with
 * free colors, the color of the project alone. The words are in the title and in the card. In
 * the short rows of the titles alone the words are smaller (the owner's choice), so that more of
 * them fit.
 */
function SizeTab({
  label,
  colorId,
  small,
}: {
  label: string | null;
  colorId: TaskColorId | null;
  small: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      title={label ?? undefined}
      style={{
        ...(colorId ? taskColorStyle(colorId) : undefined),
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
      }}
      className={`absolute top-1 bottom-1 left-4 block w-4 overflow-hidden rounded-xs border text-center leading-4 font-bold text-ellipsis whitespace-nowrap ${
        small ? 'text-[length:calc(var(--text-xs)*0.8333)]' : 'text-xs'
      } ${colorId ? '' : 'border-line-strong bg-surface'}`}
    >
      {label}
    </span>
  );
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
 * At the Team level, the piece of the rail of a project in one cell of the column: the cells of
 * its title and of its people draw it down the left edge, from the title to the last person, in
 * the color that colors the project, so that the block reads as one. The words are the tag of
 * the title.
 */
function RailPiece({ colorId, part }: { colorId: TaskColorId | null; part: RailPart }) {
  return (
    <span
      aria-hidden="true"
      style={colorId ? { backgroundColor: `var(--rb-task-${colorId}-border)` } : undefined}
      className={`absolute left-4 w-1 ${colorId ? '' : 'bg-line-strong'} ${RAIL_PART[part]}`}
    />
  );
}

/**
 * At the Team level the whole block of a project, names and days, is a rectangle: the color of its
 * bar at a quarter over the surface below, with an edge in the color of the bar.
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

/**
 * The tools of the row of a project, under the mouse and the focus: at the Team level a button that
 * adds a person, then the rows of the project, one, two or three, the same choice as
 * «Informazioni visibili» at the top, for this project alone. The choice of the timeline is not an
 * exception.
 */
function LevelButtons({
  title,
  level,
  defaultLevel,
  teamLevelAvailable,
  onSetLevel,
  onAddPerson,
}: {
  title: string;
  level: DetailLevel;
  defaultLevel: DetailLevel;
  teamLevelAvailable: boolean;
  onSetLevel: (level: DetailLevel | null) => void;
  /** Adds a person to the project; absent where the people are not shown. */
  onAddPerson?: () => void;
}) {
  return (
    <span className="absolute top-0.5 right-1 flex items-center gap-0.5 rounded-md border border-line bg-surface p-px opacity-0 transition-opacity group-hover/row:opacity-100 hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-70">
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
  /** The field that colors the projects: its value is the tab of the row; null with free colors. */
  colorField: ProjectField | null;
  /** The card with everything about the project, on the cell of the names. */
  card: ProjectCardTools;
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
 * The row of a project: in the column, the tab with its size, the shape of its state and its
 * title, and under them the teams at work, two lines and no more, every row of a level the same
 * height, with everything else in the card that opens on the cell; its bar over the days, with
 * the hard deadline as a dashed red line; at the "Team" level a row for each bar of the work,
 * the people in the color of their team and the contingency in grey, with a row that adds a person.
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
  colorField,
  card,
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
  const cellRef = useRef<HTMLDivElement>(null);
  // Stable, so that the memoized cells of the row are not redrawn by every drag.
  const addNoteAt = useStableCallback((date: string) => onAddMilestone?.(date));
  const noteTitle = useStableCallback(
    (date: string) => `Nuova nota sulla timeline il ${formatDate(date)}`,
  );
  const { personRowHeight, workBarHeight } = metrics;
  const shown = projectDrag?.project.id === project.id ? draggedProject(projectDrag) : project;
  const placed = placeTasks([shown], range).placed[0];
  const people = level === 'team' ? work : [];
  const rows = 1 + people.length;
  // The bar with its lanes, and the lines of the column: the row takes the taller.
  const geometry = projectRowGeometry(level, work.length, metrics);
  const projectRowHeight = geometry.rowHeight;
  const colorId = projectColorOf(project, config);
  const sizeValue = colorField ? coloredValueOf(project, colorField) : null;
  const tabLabel = colorField ? (sizeValue?.label ?? null) : null;
  const tabColor = colorField ? (sizeValue?.colorId ?? null) : colorId;
  const teams = teamsOf(work);
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
  const trigger = card.triggerProps(project);
  const isBar = (target: EventTarget) =>
    target instanceof HTMLElement && target.id === projectBarId(project.id);

  const dropLine = dropBefore ? 'top-0' : dropAfter ? 'bottom-0' : null;
  // The bar of the project: at the Team level it reaches down around its people, so that the bars
  // of the projects nearly touch; elsewhere it is in the row of its title.
  const encloses = people.length > 0;
  const rowHeightOf = (last: boolean) => personRowHeight + (last ? ROOM_UNDER_THE_PEOPLE : 0);
  // The focus on the bar opens the card on the cell of the names, as the mouse does.
  const barFocus = {
    onFocus: (event: FocusEvent) => {
      if (isBar(event.target) && cellRef.current) card.open(project, cellRef.current);
    },
    onBlur: (event: FocusEvent) => {
      if (isBar(event.target)) card.close();
    },
  };
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
      resizableStart={work.length === 0}
      // The title on one line, as the titles alone have it, whoever chose the level.
      overflowTitle={level === 'titles'}
      dragging={projectDrag?.project.id === project.id}
      describedBy={helpId}
      ignoreClick={ignoreProjectClick}
      onPointerDown={(event, kind) => onStartProjectDrag(event, project, kind)}
      onOpen={onOpen}
      onEditDays={work.length === 0 ? () => onEdit({ kind: 'project', id: project.id }) : undefined}
      onChange={onChange}
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
        {/* At the Team level the block of the project, a rectangle tinted with its color. */}
        {level === 'team' && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 border-y"
            style={{
              backgroundColor: blockTint(colorId, 'transparent'),
              borderColor: blockEdge(colorId),
            }}
          />
        )}
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

      {/* The cell of the names: the mouse resting on it, or a tap on its background, opens the card. */}
      <div
        ref={cellRef}
        // The grip and the tab take the left of the cell at every density.
        className={`${LABEL_CELL} flex flex-col justify-center overflow-hidden pr-2 transition-colors group-hover/row:bg-surface-strong ${
          level === 'team'
            ? 'bg-(--block-tint) py-1! pl-7 in-data-compact:pl-7'
            : 'bg-surface-muted pl-9 in-data-compact:pl-9'
        }`}
        style={{
          gridColumn: 1,
          gridRow: 1,
          height: projectRowHeight,
          ...(level === 'team' ? blockCellStyle(colorId, true, people.length === 0) : undefined),
        }}
        draggable
        {...dragSource}
        onPointerEnter={trigger.onPointerEnter}
        onPointerLeave={trigger.onPointerLeave}
        onClick={(event) => {
          if (event.target === event.currentTarget) trigger.onClick(event);
        }}
      >
        {/* The grip says the row can be dragged; the keys and the window move it as well. */}
        <span
          aria-hidden="true"
          title="Trascina per cambiare l'ordine"
          className="absolute top-1/2 left-0.5 -translate-y-1/2 cursor-grab text-fg-muted opacity-50 group-hover/row:opacity-100"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
        {level === 'team' ? (
          <>
            <RailPiece colorId={tabColor} part={people.length > 0 ? 'first' : 'only'} />
            {people.length > 0 && (
              <span aria-hidden="true" className={`${TREE_LINE} top-[calc(50%+7px)] bottom-0`} />
            )}
          </>
        ) : (
          <SizeTab label={tabLabel} colorId={tabColor} small={level === 'titles'} />
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
          title="Apri il progetto"
          className={`flex max-w-full min-w-0 cursor-pointer items-center gap-1 text-left text-xs leading-snug font-bold hover:underline ${
            // At the Team level the tag takes the right, under the buttons of the rows.
            level === 'team' ? 'w-full' : 'sm:pr-[72px]'
          }`}
        >
          <ProjectStatusMark status={project.status} iconOnly />
          <span className="truncate">
            <Highlight text={project.title} />
          </span>
          {/* At the Team level the value is a tag beside the title, as the rail has no words. */}
          {level === 'team' && sizeValue && (
            <span aria-hidden="true" className="ml-auto flex max-w-[45%] shrink-0 pl-1 font-medium">
              <FieldTag colorId={sizeValue.colorId}>{sizeValue.label}</FieldTag>
            </span>
          )}
          {colorField && sizeValue && (
            <span className="sr-only">
              , {colorField.label} {sizeValue.label}
            </span>
          )}
        </button>
        {level === 'main' && (
          <span
            title={teams.map((team) => team.name).join(', ') || undefined}
            className="block overflow-hidden text-xs leading-snug text-ellipsis whitespace-nowrap text-fg-muted"
          >
            {teams.length > 0 && <span className="sr-only">Team: </span>}
            {teams.map((team, index) => (
              <span key={team.id} className="inline-flex items-center gap-1">
                {index > 0 && (
                  <span className="mx-0.5 opacity-60" aria-hidden="true">
                    ·
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 shrink-0 rounded-full border border-line-strong"
                  style={{ backgroundColor: `var(--rb-task-${team.colorId}-border)` }}
                />
                {team.tag}
              </span>
            ))}
            {teams.length === 0 && ' '}
          </span>
        )}
        <LevelButtons
          title={project.title}
          level={level}
          defaultLevel={defaultLevel}
          teamLevelAvailable={teamLevelAvailable}
          onSetLevel={onSetLevel}
          onAddPerson={level === 'team' && !searching ? onAddAssignment : undefined}
        />
      </div>
      {/* At the Team level the bar goes around the work of its people, from the title down. */}
      {encloses && (
        <div
          className="pointer-events-none relative"
          style={{ gridColumn: 2, gridRow: `1 / span ${rows}` }}
          {...barFocus}
        >
          {projectBar}
        </div>
      )}
      <div
        className="pointer-events-none relative"
        style={{ gridColumn: 2, gridRow: 1, height: projectRowHeight }}
        {...(encloses ? {} : barFocus)}
      >
        {!encloses && projectBar}
        <MilestoneLayer
          milestones={milestones}
          range={range}
          dayWidth={dayWidth}
          top="50%"
          tools={milestoneTools}
        />
        {/* Over the bar, on the day of the deadline: where the work goes past it. */}
        {overrun && deadlineLeft !== null && (
          <DeadlineSign
            title={project.title}
            overrun={overrun}
            left={deadlineLeft}
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
        {placed && editing?.kind === 'project' && editing.id === project.id && (
          <DaysEditor
            value={project.manDays ?? 0}
            label={`Giorni uomo di «${project.title}»`}
            style={{
              left: placed.first * dayWidth + 1,
              top: `calc(50% - ${geometry.barHeight / 2}px)`,
              height: geometry.titleHeight,
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
        const last = index === people.length - 1;
        return (
          <div key={`${item.kind}-${item.id}`} className="contents">
            {/* One line, under the title and in its rail: the person, the team and the days. */}
            <div
              className={`${LABEL_CELL} flex items-center gap-1.5 border-t border-line/60 bg-(--block-tint) py-0! pl-11! text-xs`}
              style={{
                gridColumn: 1,
                gridRow,
                minHeight: rowHeightOf(last),
                ...blockCellStyle(colorId, false, last),
              }}
            >
              <RailPiece colorId={tabColor} part={last ? 'last' : 'middle'} />
              <TreeBranch last={last} />
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
              {/* In a narrow column the tag gives way first: the name and the days stay. */}
              {item.tag && (
                <span className="min-w-0 shrink-[4] truncate text-fg-muted">{item.tag}</span>
              )}
              <span className="ml-auto shrink-0 pl-1 text-fg-muted tabular-nums">
                {formatManDays(moving.manDays)}
              </span>
            </div>
            <div
              className="pointer-events-none relative"
              style={{ gridColumn: 2, gridRow, minHeight: rowHeightOf(last) }}
            >
              <WorkBar
                item={moving}
                range={range}
                dayWidth={dayWidth}
                height={personRowHeight}
                barHeight={workBarHeight}
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
                    top: `calc(50% - ${personRowHeight / 2}px)`,
                    height: personRowHeight,
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
    </div>
  );
}
