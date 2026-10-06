import { useEffect, useEffectEvent, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { DateRange } from '../../domain/schedule';
import { prefersReducedMotion } from '../../shared/motion';
import { addDaysIso, diffDays } from '../../utils/dateUtils';
import { isNearEnd } from './calendarView';
import type { CalendarJump } from './calendarView';
import { SCROLL_DURATION_MS, easeInOut, scrollStart } from './scrollMotion';

/** Scrolling counts as stopped after this long without scroll events. */
const SETTLE_MS = 150;

interface TimelineScrollOptions {
  /** The days the timeline shows. */
  range: DateRange;
  dayWidth: number;
  /** Width of the sticky column with the row names, which covers the start of the scroll area. */
  labelWidth: number;
  /** The first day in view when the timeline opens: where the user left it. */
  openOn: string;
  jump: CalendarJump;
  /** First and last day in view; `settled` once scrolling has stopped. */
  onScrolled: (first: string, last: string, settled: boolean) => void;
}

/**
 * Scrolls the timeline: to the day of each new jump, animated unless the system asks for less
 * motion; to the same first day when the zoom or the start of the range changes. Reports the days
 * in view when the month at the left edge changes, when the end comes close, and once scrolling
 * stops.
 */
export function useTimelineScroll(
  ref: RefObject<HTMLElement | null>,
  { range, dayWidth, labelWidth, openOn, jump, onScrolled }: TimelineScrollOptions,
): void {
  const firstDay = useRef(openOn);
  const previous = useRef<{ start: string; dayWidth: number; jumpId: number } | null>(null);
  const animation = useRef<number | null>(null);
  const reported = useRef<{ month: string; end: string } | null>(null);

  const daysInView = useEffectEvent((element: HTMLElement) => {
    // A day counts as in view when most of it is.
    const at = (x: number) => addDaysIso(range.start, Math.floor(x / dayWidth + 0.5));
    return {
      first: at(element.scrollLeft),
      last: at(element.scrollLeft + element.clientWidth - labelWidth - dayWidth),
    };
  });

  const report = useEffectEvent((element: HTMLElement, settled: boolean) => {
    const { first, last } = daysInView(element);
    const month = first.slice(0, 7);
    const before = reported.current;
    const nearEnd = isNearEnd(range, last) && before?.end !== range.end;
    if (!settled && before?.month === month && !nearEnd) return;
    reported.current = { month, end: range.end };
    onScrolled(first, last, settled);
  });

  const handleScroll = useEffectEvent((element: HTMLElement) => {
    firstDay.current = daysInView(element).first;
    // While a jump animates, the view already names its target.
    if (animation.current === null) report(element, false);
  });

  // Jumps, zoom and a range that grows at its start. Before paint, so nothing visibly shifts.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const before = previous.current;
    previous.current = { start: range.start, dayWidth, jumpId: jump.id };
    const offsetOf = (date: string) => diffDays(range.start, date) * dayWidth;

    if (before === null || before.jumpId !== jump.id) {
      // Opening, the timeline returns where it was left; then each jump goes to its day.
      const day = before === null ? openOn : jump.date;
      firstDay.current = day;
      stopAnimation(animation);
      const target = Math.min(
        Math.max(offsetOf(day), 0),
        element.scrollWidth - element.clientWidth,
      );
      // No motion when the timeline opens or changes zoom: there is no place to move from.
      if (before === null || before.dayWidth !== dayWidth || prefersReducedMotion()) {
        element.scrollLeft = target;
      } else {
        animateScroll(element, target, element.clientWidth - labelWidth, animation);
      }
    } else if (before.dayWidth !== dayWidth) {
      stopAnimation(animation);
      element.scrollLeft = offsetOf(firstDay.current);
    } else if (before.start !== range.start) {
      stopAnimation(animation);
      element.scrollLeft += diffDays(range.start, before.start) * dayWidth;
    }
  }, [ref, range.start, dayWidth, labelWidth, openOn, jump.id, jump.date]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let settleTimer: number | undefined;
    const onScroll = () => {
      handleScroll(element);
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (animation.current === null) report(element, true);
      }, SETTLE_MS);
    };
    // A wheel, a finger or a click on the scroll bar takes over from a running animation.
    const interrupt = () => stopAnimation(animation);
    element.addEventListener('scroll', onScroll, { passive: true });
    element.addEventListener('wheel', interrupt, { passive: true });
    element.addEventListener('touchstart', interrupt, { passive: true });
    element.addEventListener('pointerdown', interrupt, { passive: true });
    return () => {
      window.clearTimeout(settleTimer);
      stopAnimation(animation);
      element.removeEventListener('scroll', onScroll);
      element.removeEventListener('wheel', interrupt);
      element.removeEventListener('touchstart', interrupt);
      element.removeEventListener('pointerdown', interrupt);
    };
  }, [ref]);
}

function stopAnimation(animation: RefObject<number | null>): void {
  if (animation.current === null) return;
  window.cancelAnimationFrame(animation.current);
  animation.current = null;
}

function animateScroll(
  element: HTMLElement,
  target: number,
  viewport: number,
  animation: RefObject<number | null>,
): void {
  const from = scrollStart(element.scrollLeft, target, viewport);
  element.scrollLeft = from;
  const startedAt = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / SCROLL_DURATION_MS);
    element.scrollLeft = from + (target - from) * easeInOut(progress);
    animation.current = progress < 1 ? window.requestAnimationFrame(step) : null;
  };
  animation.current = window.requestAnimationFrame(step);
}
