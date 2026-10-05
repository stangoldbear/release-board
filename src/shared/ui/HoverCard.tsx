import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, MouseEvent, PointerEvent, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';

/** How long the mouse rests on a trigger before its card opens; next to an open card, at once. */
const OPEN_DELAY_MS = 300;
/** Time to move the mouse from the trigger onto the card, which keeps it open. */
const CLOSE_DELAY_MS = 150;
/** A card that closed less than this long ago lets the next one open at once. */
const WARM_MS = 400;

interface OpenCard<T> {
  item: T;
  anchor: HTMLElement;
  /** Opened with a click or a tap: it stays until dismissed. */
  pinned: boolean;
}

/**
 * A card of details for many triggers, such as the cells of a row: it opens when the mouse rests
 * on a trigger or the keyboard focuses it, and stays open after a click or a tap. Esc, a click
 * elsewhere or a scroll closes it. The content must also be in the trigger's accessible name: the
 * card repeats it for the eyes.
 */
export function useHoverCard<T>() {
  const [card, setCard] = useState<OpenCard<T> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const closedAt = useRef(0);

  const show = (next: OpenCard<T> | null) => {
    window.clearTimeout(timer.current);
    if (next === null) closedAt.current = performance.now();
    setCard(next);
  };
  const later = (delay: number, next: OpenCard<T> | null) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => show(next), delay);
  };

  useEffect(() => {
    if (!card) return;
    const close = () => {
      window.clearTimeout(timer.current);
      closedAt.current = performance.now();
      setCard(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (!card.anchor.contains(target) && !cardRef.current?.contains(target)) close();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    // The card is placed on the screen, so it would drift away from a trigger that scrolls.
    window.addEventListener('scroll', close, { capture: true, passive: true });
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('resize', close);
    };
  }, [card]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const triggerProps = (item: T) => ({
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'mouse' || card?.pinned) return;
      const warm = card !== null || performance.now() - closedAt.current < WARM_MS;
      later(warm ? 0 : OPEN_DELAY_MS, { item, anchor: event.currentTarget, pinned: false });
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'mouse' || card?.pinned) return;
      later(CLOSE_DELAY_MS, null);
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (!card?.pinned) show({ item, anchor: event.currentTarget, pinned: false });
    },
    onBlur: () => {
      if (!card?.pinned) show(null);
    },
    onClick: (event: MouseEvent<HTMLElement>) => {
      const anchor = event.currentTarget;
      show(card?.pinned && card.anchor === anchor ? null : { item, anchor, pinned: true });
    },
  });

  const cardProps = {
    cardRef,
    // Moving onto the card keeps it open, so that its text can be read and selected.
    onPointerEnter: () => window.clearTimeout(timer.current),
    onPointerLeave: () => {
      if (!card?.pinned) later(CLOSE_DELAY_MS, null);
    },
  };

  return { card, triggerProps, cardProps };
}

interface HoverCardProps {
  anchor: HTMLElement;
  children: ReactNode;
  cardRef: RefObject<HTMLDivElement | null>;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

/**
 * The card itself, below its trigger, or above when there is no room below, inside the screen.
 * It fades in from slightly smaller, from the side of its trigger; with reduced motion it only
 * fades. Moving between triggers keeps the same card, so it changes without animating again.
 */
export function HoverCard({
  anchor,
  children,
  cardRef,
  onPointerEnter,
  onPointerLeave,
}: HoverCardProps) {
  // On every render: the content may change the card's size.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const gap = 6;
    const margin = 8;
    const trigger = anchor.getBoundingClientRect();
    const { width, height } = card.getBoundingClientRect();
    const below = trigger.bottom + gap + height <= window.innerHeight - margin;
    const top = below ? trigger.bottom + gap : Math.max(margin, trigger.top - gap - height);
    const left = Math.min(
      Math.max(trigger.left + trigger.width / 2 - width / 2, margin),
      window.innerWidth - width - margin,
    );
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
    card.style.transformOrigin = `${trigger.left + trigger.width / 2 - left}px ${below ? 'top' : 'bottom'}`;
  });

  return createPortal(
    <div
      ref={cardRef}
      role="tooltip"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className="fixed top-0 left-0 z-50 w-72 max-w-[calc(100vw-16px)] rounded-xl border border-line bg-surface p-3 text-fg shadow-2xl transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] starting:scale-[0.97] starting:opacity-0 motion-reduce:starting:scale-100"
    >
      {children}
    </div>,
    document.body,
  );
}
