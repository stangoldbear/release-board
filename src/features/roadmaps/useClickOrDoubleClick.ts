import { useEffect, useRef } from 'react';
import type { MouseEvent, PointerEvent } from 'react';

/** How long a mouse click waits for a second one before it counts as a click. */
export const DOUBLE_CLICK_MS = 220;

/**
 * A click that opens and a double click that edits, on the same element: a mouse click waits a
 * moment for a second one, while a tap and the keyboard open at once. `ignore` is asked first,
 * for the click that ends a drag. Without `onDoubleClick` every click opens at once.
 */
export function useClickOrDoubleClick(
  onClick: () => void,
  onDoubleClick: (() => void) | undefined,
  ignore: () => boolean,
) {
  const timer = useRef<number | undefined>(undefined);
  const pointerType = useRef('mouse');
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return {
    onPointerDown: (event: PointerEvent) => {
      pointerType.current = event.pointerType;
    },
    onClick: (event: MouseEvent) => {
      window.clearTimeout(timer.current);
      if (ignore() || event.detail >= 2) return;
      // detail is 0 for a click from the keyboard.
      if (!onDoubleClick || event.detail === 0 || pointerType.current === 'touch') {
        onClick();
        return;
      }
      timer.current = window.setTimeout(onClick, DOUBLE_CLICK_MS);
    },
    onDoubleClick: () => {
      window.clearTimeout(timer.current);
      if (!ignore()) onDoubleClick?.();
    },
  };
}
