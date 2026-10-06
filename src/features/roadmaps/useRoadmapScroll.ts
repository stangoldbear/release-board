import { useEffect, useEffectEvent, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { DateRange } from '../../domain/schedule';
import { prefersReducedMotion } from '../../shared/motion';
import { addDaysIso, diffDays } from '../../utils/dateUtils';

/** Today stands at a quarter of the width in view: the past before it, more future after. */
const TODAY_AT = 0.25;

/**
 * Scrolls the roadmap: today at a quarter of the view when it opens and at each request for
 * today, then keeping the same first day in view when the scale changes or the range grows at its
 * start.
 */
export function useRoadmapScroll(
  ref: RefObject<HTMLElement | null>,
  range: DateRange,
  dayWidth: number,
  today: string,
  /** A new value asks to bring today into view. */
  todayRequest: number,
): void {
  const firstDay = useRef<string | null>(null);
  const previous = useRef<{ start: string; dayWidth: number; request: number } | null>(null);

  const remember = useEffectEvent((element: HTMLElement) => {
    firstDay.current = addDaysIso(range.start, Math.floor(element.scrollLeft / dayWidth));
  });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const before = previous.current;
    previous.current = { start: range.start, dayWidth, request: todayRequest };
    const offsetOf = (date: string) => Math.max(diffDays(range.start, date), 0) * dayWidth;
    // The days start after the column of the projects, which the content's width also holds.
    const days = (diffDays(range.start, range.end) + 1) * dayWidth;
    const view = element.clientWidth - (element.scrollWidth - days);
    const todayLeft = Math.max(offsetOf(today) - view * TODAY_AT, 0);
    if (before === null) {
      element.scrollLeft = todayLeft;
    } else if (before.request !== todayRequest) {
      element.scrollTo({
        left: todayLeft,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    } else if (before.dayWidth !== dayWidth && firstDay.current) {
      element.scrollLeft = offsetOf(firstDay.current);
    } else if (before.start !== range.start) {
      element.scrollLeft += diffDays(range.start, before.start) * dayWidth;
    }
    remember(element);
  }, [ref, range.start, range.end, dayWidth, today, todayRequest]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const onScroll = () => remember(element);
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => element.removeEventListener('scroll', onScroll);
  }, [ref]);
}
