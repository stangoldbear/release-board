import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { TaskChanges } from '../../domain/plan';
import { moveTask, resizeTask } from '../../domain/schedule';
import type { TaskItem } from '../../domain/types';

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

interface DragState extends TaskDrag {
  originX: number;
  originY: number;
  /** The pointer went far enough to count as a drag rather than a click. */
  moved: boolean;
}

/** Pixels the pointer can travel before a press becomes a drag. */
const CLICK_TOLERANCE = 4;

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
 * Drags task bars with a mouse or a pen, through Pointer Events. On touch screens a finger scrolls
 * the calendar instead, and a tap opens the task. Esc cancels a drag.
 */
export function useTaskDrag(
  dayWidth: number,
  onChangeTask: (taskId: string, changes: TaskChanges) => void,
) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const justDragged = useRef(false);

  const update = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const startDrag = (event: ReactPointerEvent, task: TaskItem, kind: DragKind) => {
    if (event.button !== 0 || event.pointerType === 'touch') return;
    // The handles sit inside the bar: only the innermost one starts the drag.
    event.stopPropagation();
    update({
      task,
      kind,
      days: 0,
      laneId: task.laneId,
      originX: event.clientX,
      originY: event.clientY,
      moved: false,
    });
  };

  const onPointerMove = useEffectEvent((event: PointerEvent) => {
    const current = dragRef.current;
    if (!current) return;
    const deltaX = event.clientX - current.originX;
    const days = Math.round(deltaX / dayWidth);
    const lane = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-lane-id]');
    const laneId =
      current.kind === 'move'
        ? (lane?.getAttribute('data-lane-id') ?? current.laneId)
        : current.laneId;
    const moved =
      current.moved || Math.hypot(deltaX, event.clientY - current.originY) > CLICK_TOLERANCE;
    if (days !== current.days || laneId !== current.laneId || moved !== current.moved) {
      update({ ...current, days, laneId, moved });
    }
  });

  const onPointerUp = useEffectEvent(() => {
    const current = dragRef.current;
    update(null);
    if (!current?.moved) return;
    // The click that follows the release must not open the task.
    justDragged.current = true;
    window.setTimeout(() => {
      justDragged.current = false;
    }, 0);
    const changes = dragChanges(current);
    if (Object.keys(changes).length > 0) onChangeTask(current.task.id, changes);
  });

  const onCancel = useEffectEvent(() => update(null));

  const isDragging = drag !== null;
  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (event: PointerEvent) => onPointerMove(event);
    const handleUp = () => onPointerUp();
    const handleCancel = () => onCancel();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDragging]);

  return {
    /** The drag in progress, once the pointer has moved; null otherwise. */
    drag: drag?.moved ? drag : null,
    startDrag,
    /** True for the click that ends a drag, which should be ignored. */
    isClickAfterDrag: () => justDragged.current,
  };
}
