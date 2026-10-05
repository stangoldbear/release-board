import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { DateRange } from '../../domain/schedule';
import { addDaysIso } from '../../utils/dateUtils';
import { CLICK_TOLERANCE } from './useTaskDrag';

export interface NoteDrag {
  /** The day the note comes from. */
  from: string;
  /** The day under the pointer, within the visible period. */
  to: string;
  /** False when `to` already has a note: a day has one. */
  allowed: boolean;
}

interface DragState extends NoteDrag {
  originX: number;
  originY: number;
  /** The pointer went far enough to count as a drag rather than a click. */
  moved: boolean;
}

/** The day `days` after `date`, kept within the visible period. */
function dayWithin(date: string, days: number, period: DateRange): string {
  const day = addDaysIso(date, days);
  if (day < period.start) return period.start;
  return day > period.end ? period.end : day;
}

/**
 * Drags the notes of the calendar from one day to another with a mouse or a pen, like the tasks;
 * on touch screens a finger scrolls the calendar instead. A day that already has a note does not
 * take another one. Esc cancels a drag.
 */
export function useNoteDrag(
  dayWidth: number,
  period: DateRange,
  isDayFree: (date: string) => boolean,
  onMoveNote: (from: string, to: string) => void,
) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const justDragged = useRef(false);

  const update = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const startDrag = (event: ReactPointerEvent, date: string) => {
    if (event.button !== 0 || event.pointerType === 'touch') return;
    update({
      from: date,
      to: date,
      allowed: true,
      originX: event.clientX,
      originY: event.clientY,
      moved: false,
    });
  };

  const onPointerMove = useEffectEvent((event: PointerEvent) => {
    const current = dragRef.current;
    if (!current) return;
    const deltaX = event.clientX - current.originX;
    const to = dayWithin(current.from, Math.round(deltaX / dayWidth), period);
    const allowed = to === current.from || isDayFree(to);
    const moved =
      current.moved || Math.hypot(deltaX, event.clientY - current.originY) > CLICK_TOLERANCE;
    if (to !== current.to || allowed !== current.allowed || moved !== current.moved) {
      update({ ...current, to, allowed, moved });
    }
  });

  const onPointerUp = useEffectEvent(() => {
    const current = dragRef.current;
    update(null);
    if (!current?.moved) return;
    // The click that follows the release must not open the note.
    justDragged.current = true;
    window.setTimeout(() => {
      justDragged.current = false;
    }, 0);
    if (current.to !== current.from && current.allowed) onMoveNote(current.from, current.to);
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
