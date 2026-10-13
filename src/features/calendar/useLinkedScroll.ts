import { useCallback, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** Scroll positions closer than this are the same place: browsers round them to device pixels. */
const SAME_PLACE = 1;

/**
 * Keeps elements side by side at the same horizontal scroll: whichever one the user scrolls, with
 * a wheel, a finger, its scroll bar or the focus, the others follow. A scroll an element makes
 * only because it follows does not lead in turn, so that a late echo never pulls back the element
 * that is still moving. Returns a stable function that brings the others to the lead's place at
 * once, for the scrolls the app makes itself: their scroll event would come a frame later. The
 * list of followers must be stable, as from `useMemo`.
 */
export function useLinkedScroll(
  lead: RefObject<HTMLElement | null>,
  followers: readonly RefObject<HTMLElement | null>[],
): () => void {
  const follow = useRef<() => void>(() => {});

  // Before paint and before the scrolls of the timeline, which may follow at once.
  useLayoutEffect(() => {
    const elements = [lead, ...followers]
      .map((ref) => ref.current)
      .filter((element): element is HTMLElement => element !== null);
    // Where each follower was sent: its next scroll event at that place is not the user's.
    const echoes = new Map<HTMLElement, number>();
    const alignTo = (leader: HTMLElement) => {
      for (const other of elements) {
        if (other === leader || Math.abs(other.scrollLeft - leader.scrollLeft) < SAME_PLACE) {
          continue;
        }
        other.scrollLeft = leader.scrollLeft;
        echoes.set(other, other.scrollLeft);
      }
    };
    const leadElement = lead.current;
    if (leadElement) follow.current = () => alignTo(leadElement);

    const removers = elements.map((element) => {
      const onScroll = () => {
        const echo = echoes.get(element);
        echoes.delete(element);
        if (echo !== undefined && Math.abs(echo - element.scrollLeft) < SAME_PLACE) return;
        alignTo(element);
      };
      element.addEventListener('scroll', onScroll, { passive: true });
      return () => element.removeEventListener('scroll', onScroll);
    });
    return () => {
      follow.current = () => {};
      for (const remove of removers) remove();
    };
  }, [lead, followers]);

  return useCallback(() => follow.current(), []);
}
