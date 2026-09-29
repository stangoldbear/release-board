import { useEffect, useEffectEvent } from 'react';
import type { RefObject } from 'react';

/** Ctrl+wheel distance, in pixels, that makes one zoom step. */
const WHEEL_STEP = 40;
/** Change of the distance between two fingers that makes one zoom step. */
const PINCH_IN = 1.25;
const PINCH_OUT = 0.8;
/** One gesture changes the zoom by one level at most this often. */
const MIN_INTERVAL_MS = 300;

/** Safari's trackpad pinch event, missing from the standard DOM types. */
type GestureEvent = Event & { scale: number };

function fingerDistance(touches: TouchList): number {
  const [a, b] = [touches[0], touches[1]];
  return a && b ? Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) : 0;
}

/**
 * Zooms with Ctrl+wheel (and a trackpad pinch, which browsers report the same way) and with a
 * two-finger pinch. The element should have `touch-action: pan-x pan-y`, so that a pinch zooms the
 * calendar rather than the page. `onZoom(-1)` zooms in, `onZoom(1)` zooms out.
 */
export function useZoomGestures(
  ref: RefObject<HTMLElement | null>,
  onZoom: (step: -1 | 1) => void,
): void {
  const zoom = useEffectEvent(onZoom);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let lastStepAt = 0;
    const step = (direction: -1 | 1) => {
      const now = performance.now();
      if (now - lastStepAt < MIN_INTERVAL_MS) return;
      lastStepAt = now;
      zoom(direction);
    };

    let wheelTotal = 0;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      // Without this the browser would zoom the whole page.
      event.preventDefault();
      wheelTotal += event.deltaY;
      if (Math.abs(wheelTotal) >= WHEEL_STEP) {
        step(wheelTotal < 0 ? -1 : 1);
        wheelTotal = 0;
      }
    };

    let pinchStart: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      pinchStart = event.touches.length === 2 ? fingerDistance(event.touches) : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (pinchStart === null || event.touches.length !== 2) return;
      const ratio = fingerDistance(event.touches) / pinchStart;
      if (ratio > PINCH_IN || ratio < PINCH_OUT) {
        step(ratio > 1 ? -1 : 1);
        pinchStart = fingerDistance(event.touches);
      }
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchStart = null;
    };

    // Safari reports pinches as gesture events and zooms the page unless they are cancelled.
    let gestureZoomed = false;
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gestureZoomed = false;
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const { scale } = event as GestureEvent;
      if (!gestureZoomed && (scale > PINCH_IN || scale < PINCH_OUT)) {
        gestureZoomed = true;
        step(scale > 1 ? -1 : 1);
      }
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: true });
    element.addEventListener('touchend', onTouchEnd, { passive: true });
    element.addEventListener('touchcancel', onTouchEnd, { passive: true });
    element.addEventListener('gesturestart', onGestureStart);
    element.addEventListener('gesturechange', onGestureChange);
    return () => {
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchEnd);
      element.removeEventListener('gesturestart', onGestureStart);
      element.removeEventListener('gesturechange', onGestureChange);
    };
  }, [ref]);
}
