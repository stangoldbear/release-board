import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/** Pixels the pointer can travel before a press becomes a drag. */
export const CLICK_TOLERANCE = 4;

interface Gesture<T> {
  value: T;
  originX: number;
  originY: number;
  /** The pointer went far enough to count as a drag rather than a click. */
  moved: boolean;
}

/**
 * Drags something on the calendar or the roadmap with a mouse or a pen, through Pointer Events: on
 * touch screens a finger scrolls instead, and a tap is a click. `track` gives what the drag would
 * do for the pointer's distance from where the press started, returning the same value when
 * nothing changes; `drop` receives what the drag does when the button is released. Esc cancels a
 * drag.
 */
export function usePointerDrag<T>(
  track: (value: T, delta: { x: number; y: number }, event: PointerEvent) => T,
  drop: (value: T) => void,
) {
  const [gesture, setGesture] = useState<Gesture<T> | null>(null);
  const gestureRef = useRef<Gesture<T> | null>(null);
  const justDragged = useRef(false);

  const update = (next: Gesture<T> | null) => {
    gestureRef.current = next;
    setGesture(next);
  };

  /** Starts tracking a press; false when it is not one that drags, as a finger's. */
  const start = (event: ReactPointerEvent, value: T): boolean => {
    if (event.button !== 0 || event.pointerType === 'touch') return false;
    update({ value, originX: event.clientX, originY: event.clientY, moved: false });
    return true;
  };

  const onPointerMove = useEffectEvent((event: PointerEvent) => {
    const current = gestureRef.current;
    if (!current) return;
    const delta = { x: event.clientX - current.originX, y: event.clientY - current.originY };
    const value = track(current.value, delta, event);
    const moved = current.moved || Math.hypot(delta.x, delta.y) > CLICK_TOLERANCE;
    if (value !== current.value || moved !== current.moved) update({ ...current, value, moved });
  });

  const onPointerUp = useEffectEvent(() => {
    const current = gestureRef.current;
    update(null);
    if (!current?.moved) return;
    // The click that follows the release must not open what was dragged.
    justDragged.current = true;
    window.setTimeout(() => {
      justDragged.current = false;
    }, 0);
    drop(current.value);
  });

  const onCancel = useEffectEvent(() => update(null));

  const isDragging = gesture !== null;
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
    /** What the drag in progress would do, once the pointer has moved; null otherwise. */
    drag: gesture?.moved ? gesture.value : null,
    start,
    /** True for the click that ends a drag, which should be ignored. */
    isClickAfterDrag: () => justDragged.current,
  };
}
