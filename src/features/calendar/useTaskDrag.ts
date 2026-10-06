import type { PointerEvent as ReactPointerEvent } from 'react';
import type { TaskChanges } from '../../domain/plan';
import { moveTask, resizeTask } from '../../domain/schedule';
import type { TaskItem } from '../../domain/types';
import { usePointerDrag } from './usePointerDrag';

/** Moving the whole task, or one of its ends. */
export type DragKind = 'move' | 'start' | 'end';

export interface TaskDrag {
  task: TaskItem;
  kind: DragKind;
  /** Days moved so far. */
  days: number;
  /** Lane under the pointer; only a move changes lane. */
  laneId: string;
}

/** The task as it would be after the drag. */
export function draggedTask({ task, kind, days, laneId }: TaskDrag): TaskItem {
  if (kind !== 'move') return resizeTask(task, kind, days);
  return { ...moveTask(task, days), laneId };
}

function dragChanges(drag: TaskDrag): TaskChanges {
  const after = draggedTask(drag);
  const changes: TaskChanges = {};
  if (after.startDate !== drag.task.startDate) changes.startDate = after.startDate;
  if (after.endDate !== drag.task.endDate) changes.endDate = after.endDate;
  if (after.laneId !== drag.task.laneId) changes.laneId = after.laneId;
  return changes;
}

/**
 * Drags task bars with a mouse or a pen: a move follows the pointer across days and lanes, a
 * handle moves one end. On touch screens a finger scrolls the calendar, and a tap opens the task.
 */
export function useTaskDrag(
  dayWidth: number,
  onChangeTask: (taskId: string, changes: TaskChanges) => void,
) {
  const { drag, start, isClickAfterDrag } = usePointerDrag<TaskDrag>(
    (current, delta, event) => {
      const days = Math.round(delta.x / dayWidth);
      const lane = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('[data-lane-id]');
      const laneId =
        current.kind === 'move'
          ? (lane?.getAttribute('data-lane-id') ?? current.laneId)
          : current.laneId;
      return days === current.days && laneId === current.laneId
        ? current
        : { ...current, days, laneId };
    },
    (done) => {
      const changes = dragChanges(done);
      if (Object.keys(changes).length > 0) onChangeTask(done.task.id, changes);
    },
  );

  const startDrag = (event: ReactPointerEvent, task: TaskItem, kind: DragKind) => {
    // The handles sit inside the bar: only the innermost one starts the drag.
    if (start(event, { task, kind, days: 0, laneId: task.laneId })) event.stopPropagation();
  };

  return { drag, startDrag, isClickAfterDrag };
}
