import { memo, useId, useState } from 'react';
import type { TaskChanges } from '../../domain/plan';
import { placeTasks } from '../../domain/schedule';
import type { Lane, TaskItem } from '../../domain/types';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { useStableCallback } from '../../shared/useStableCallback';
import type { TimelineGeometry } from '../timeline/TimelineFrame';
import { DragHint } from './DragHint';
import { TaskBar, taskBarId } from './TaskBar';
import { TaskContextMenu } from './TaskContextMenu';
import { LABEL_CELL, columnEdge, columnFill, stackingOrder } from './timelineLayout';
import type { Column, TimelineMetrics } from './timelineLayout';
import { draggedTask, useTaskDrag } from './useTaskDrag';

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
  onDeleteTask: (taskId: string) => void;
  onAddTaskAt: (date: string, laneId: string) => void;
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
  onDeleteTask,
  onAddTaskAt,
}: LanesSectionProps) {
  const { range, dayWidth, today, columns, todayOffset } = geometry;
  const { barHeight, trackGap, lanePadding } = sizes;
  const helpId = useId();
  const [menu, setMenu] = useState<{ task: TaskItem; x: number; y: number } | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);
  const { drag, startDrag, isClickAfterDrag } = useTaskDrag(dayWidth, onChangeTask);

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
      <div className="divide-y divide-line">
        {lanes.map((lane) => {
          const laneTasks = shownTasks.filter((task) => task.laneId === lane.id);
          const { placed, tracks } = placeTasks(laneTasks, range);
          const height = Math.max(1, tracks) * (barHeight + trackGap) + lanePadding * 2;
          const isDropTarget =
            drag !== null && drag.laneId !== drag.task.laneId && drag.laneId === lane.id;
          return (
            <div
              key={lane.id}
              data-lane-id={lane.id}
              className={`group/row flex ${isDropTarget ? 'bg-accent-soft' : ''}`}
              style={{ minHeight: height }}
            >
              <div
                className={`${LABEL_CELL} flex flex-col justify-center bg-surface-muted transition-colors group-hover/row:bg-surface-strong`}
                title={lane.name}
              >
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
