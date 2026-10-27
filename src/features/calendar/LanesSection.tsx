import { memo, useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { GripVertical } from 'lucide-react';
import { laneFollowerAt, taskColorOf } from '../../domain/lanes';
import type { TaskChanges } from '../../domain/plan';
import { placeTasks } from '../../domain/schedule';
import type { Lane, TaskItem } from '../../domain/types';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { useListDrag } from '../../shared/useListDrag';
import { useStableCallback } from '../../shared/useStableCallback';
import type { TimelineGeometry } from '../timeline/TimelineFrame';
import { DragHint } from './DragHint';
import { TaskBar, taskBarId } from './TaskBar';
import { TaskContextMenu } from './TaskContextMenu';
import { LABEL_CELL, columnEdge, columnFill, stackingOrder } from './timelineLayout';
import type { Column, TimelineMetrics } from './timelineLayout';
import { draggedTask, useTaskDrag } from './useTaskDrag';
import { taskSplitParts } from '../tasks/taskSplit';

interface LaneCellsProps {
  columns: Column[];
  laneId: string;
  onAdd: (date: string, laneId: string) => void;
}

/** The days of a lane: a click adds a task there. Memoized, since a drag redraws only the bars. */
const LaneCells = memo(function LaneCells({ columns, laneId, onAdd }: LaneCellsProps) {
  return columns.map((column) => (
    <div
      key={column.start}
      onClick={() => onAdd(column.start, laneId)}
      style={{ width: column.width }}
      // The plus is drawn by CSS: one icon element per day would weigh on long timelines.
      className={`flex shrink-0 cursor-pointer items-center justify-center text-base text-link after:opacity-0 after:content-['+'] hover:bg-accent-soft hover:after:opacity-100 pointer-coarse:after:hidden ${columnEdge(column)} ${columnFill(column)}`}
    />
  ));
});

interface LanesSectionProps {
  geometry: TimelineGeometry;
  tasks: TaskItem[];
  /** The lanes to draw, in order: those not hidden. */
  lanes: Lane[];
  sizes: Pick<TimelineMetrics, 'barHeight' | 'trackGap' | 'lanePadding' | 'barLines'>;
  /** Titles on one line, out of their bars when longer. */
  oneLineTitles: boolean;
  onChangeTask: (taskId: string, changes: TaskChanges) => void;
  onOpenTask: (task: TaskItem) => void;
  onDuplicateTask: (task: TaskItem) => void;
  onSplitTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskAt: (date: string, laneId: string) => void;
  /** Puts a lane right before another one, or last when `beforeId` is null. */
  onMoveLane: (laneId: string, beforeId: string | null) => void;
}

/** The lanes travel with their own type, so that nothing else lands among them. */
const LANE_ROW_TYPE = 'application/x-release-board-lane-row';

/** The handle that moves a lane, to give it the focus back after a move. */
function laneHandleId(laneId: string): string {
  return `lane-handle-${laneId}`;
}

/**
 * The lanes of the releases as rows of task bars over the days: a bar moves by dragging, with the
 * work across lanes, and its edges change its dates; a click on a day adds a task there. The
 * section keeps its drag to itself: a drag redraws only its bars.
 */
export function LanesSection({
  geometry,
  tasks,
  lanes,
  sizes,
  oneLineTitles,
  onChangeTask,
  onOpenTask,
  onDuplicateTask,
  onSplitTask,
  onDeleteTask,
  onAddTaskAt,
  onMoveLane,
}: LanesSectionProps) {
  const { range, dayWidth, today, columns, todayOffset } = geometry;
  const { barHeight, trackGap, lanePadding } = sizes;
  const helpId = useId();
  const [menu, setMenu] = useState<{ task: TaskItem; x: number; y: number } | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);
  const { drag, startDrag, isClickAfterDrag } = useTaskDrag(dayWidth, onChangeTask);
  const laneHelpId = useId();
  const [announcement, setAnnouncement] = useState('');
  const laneIds = lanes.map((lane) => lane.id);
  // A lane dragged by its name lands before the lane under the pointer, or after the last one.
  const moveLaneTo = (laneId: string, index: number) => {
    const lane = lanes.find((item) => item.id === laneId);
    if (!lane) return;
    onMoveLane(laneId, laneFollowerAt(lanes, laneId, index));
    setAnnouncement(`Corsia ${lane.name} in posizione ${index + 1} di ${lanes.length}`);
    window.requestAnimationFrame(() => document.getElementById(laneHandleId(laneId))?.focus());
  };
  const laneDrag = useListDrag(LANE_ROW_TYPE, (laneId, _list, index) => moveLaneTo(laneId, index));
  const moveLaneByKey = (event: KeyboardEvent, laneId: string, index: number) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const target = index + (event.key === 'ArrowUp' ? -1 : 1);
    if (target >= 0 && target < lanes.length) moveLaneTo(laneId, target);
  };

  // Stable handler for the memoized cells, which a drag or a scroll does not redraw.
  const addTaskAt = useStableCallback((date: string, laneId: string) => {
    if (!isClickAfterDrag()) onAddTaskAt(date, laneId);
  });

  // While dragging, the task is drawn where it would land.
  const shownTasks = drag
    ? tasks.map((task) => (task.id === drag.task.id ? draggedTask(drag) : task))
    : tasks;

  const focusBar = (taskId: string) => document.getElementById(taskBarId(taskId))?.focus();

  return (
    <>
      <p id={helpId} className="sr-only">
        Frecce sinistra e destra spostano l&apos;attività di un giorno; con Maiusc cambiano la data
        di fine. Invio la apre, il tasto menu mostra le altre azioni.
      </p>
      <p id={laneHelpId} className="sr-only">
        Alt e le frecce su e giù spostano la corsia prima o dopo le altre.
      </p>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <div {...laneDrag.container} className="divide-y divide-line">
        {lanes.map((lane, index) => {
          const laneTasks = shownTasks.filter((task) => task.laneId === lane.id);
          const { placed, tracks } = placeTasks(laneTasks, range);
          const height = Math.max(1, tracks) * (barHeight + trackGap) + lanePadding * 2;
          const isDropTarget =
            drag !== null && drag.laneId !== drag.task.laneId && drag.laneId === lane.id;
          return (
            <div
              key={lane.id}
              data-lane-id={lane.id}
              {...laneDrag.target('lanes', laneIds, index, 'y')}
              className={`group/row relative flex ${isDropTarget ? 'bg-accent-soft' : ''} ${
                laneDrag.dragged === lane.id ? 'opacity-50' : ''
              }`}
              style={{ minHeight: height }}
            >
              {(laneDrag.slot('lanes') === index ||
                (index === lanes.length - 1 && laneDrag.slot('lanes') === lanes.length)) && (
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-0 z-[701] h-0.5 bg-link ${
                    laneDrag.slot('lanes') === index ? '-top-px' : '-bottom-px'
                  }`}
                />
              )}
              {/* The name moves the lane by dragging; its handle, with Alt and the arrows. */}
              <div
                className={`${LABEL_CELL} flex flex-col justify-center bg-surface-muted pl-7 transition-colors group-hover/row:bg-surface-strong in-data-compact:pl-7`}
                title={lane.name}
                draggable={lanes.length > 1}
                {...(lanes.length > 1 ? laneDrag.source(lane.id, 'lanes') : {})}
              >
                {/* The color of the row, which its tasks take: the name says the rest. */}
                {lane.colorId && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1 left-0 w-1 rounded-r-sm"
                    style={{ backgroundColor: `var(--rb-task-${lane.colorId}-border)` }}
                  />
                )}
                {lanes.length > 1 && (
                  <button
                    type="button"
                    id={laneHandleId(lane.id)}
                    aria-label={`Sposta la corsia ${lane.name}`}
                    aria-describedby={laneHelpId}
                    aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                    title="Trascina per cambiare l’ordine; Alt e le frecce lo cambiano da tastiera"
                    onKeyDown={(event) => moveLaneByKey(event, lane.id, index)}
                    className="absolute top-1/2 left-0.5 flex h-6 w-6 -translate-y-1/2 cursor-grab items-center justify-center rounded text-fg-muted opacity-60 group-hover/row:opacity-100 hover:bg-surface hover:text-fg focus-visible:opacity-100 active:cursor-grabbing"
                  >
                    <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
                <span className="text-xs font-bold tracking-wide break-words uppercase">
                  {lane.name}
                </span>
                <span className="text-xs text-fg-muted">{placed.length} attività</span>
              </div>

              <div className="relative flex">
                <LaneCells columns={columns} laneId={lane.id} onAdd={addTaskAt} />
                {/* The row under the mouse, name and days, so that a bar is matched to its lane. */}
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

                <div className="pointer-events-none absolute inset-0">
                  {placed.map((item) => (
                    <TaskBar
                      key={item.task.id}
                      placed={item}
                      colorId={taskColorOf(item.task, lane)}
                      dayWidth={dayWidth}
                      top={lanePadding + item.track * (barHeight + trackGap)}
                      height={barHeight}
                      lines={sizes.barLines}
                      overflowTitle={oneLineTitles}
                      stacking={stackingOrder(today, item.task.startDate)}
                      dragging={drag?.task.id === item.task.id}
                      describedBy={helpId}
                      onPointerDown={(event, kind) => {
                        const original = tasks.find((task) => task.id === item.task.id);
                        if (original) startDrag(event, original, kind);
                      }}
                      onOpen={() => {
                        if (!isClickAfterDrag()) onOpenTask(item.task);
                      }}
                      onContextMenu={(x, y) => setMenu({ task: item.task, x, y })}
                      onChange={(changes) => onChangeTask(item.task.id, changes)}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {drag && (
        <DragHint>
          {drag.kind === 'move' ? 'Sposta' : drag.kind === 'start' ? 'Inizio' : 'Fine'}{' '}
          <strong className="tabular-nums">
            {drag.days > 0 ? `+${drag.days}` : drag.days}{' '}
            {Math.abs(drag.days) === 1 ? 'giorno' : 'giorni'}
          </strong>
          {drag.laneId !== drag.task.laneId && " su un'altra corsia"}
        </DragHint>
      )}

      {menu && (
        <TaskContextMenu
          task={menu.task}
          x={menu.x}
          y={menu.y}
          onEdit={() => onOpenTask(menu.task)}
          onDuplicate={() => onDuplicateTask(menu.task)}
          onSplit={taskSplitParts(menu.task) >= 2 ? () => onSplitTask(menu.task) : undefined}
          onDelete={() => setTaskToDelete(menu.task)}
          onClose={() => {
            focusBar(menu.task.id);
            setMenu(null);
          }}
        />
      )}

      {taskToDelete && (
        <ConfirmDialog
          title="Eliminare l'attività?"
          message="L'attività viene rimossa dal calendario."
          itemTitle={taskToDelete.title}
          confirmLabel="Elimina"
          onConfirm={() => {
            onDeleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }}
          onCancel={() => setTaskToDelete(null)}
        />
      )}
    </>
  );
}
