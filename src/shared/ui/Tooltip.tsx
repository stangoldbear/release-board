import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, PointerEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { placePopup } from './popup';

/** How long the mouse rests on a control before its tooltip shows. */
const SHOW_DELAY_MS = 300;
/** After a tooltip closed, the next one on another control shows at once for this long. */
const WARM_MS = 400;

/** When the last tooltip closed, shared by all of them, as moving along a toolbar is one gesture. */
let lastClosedAt = 0;

interface TooltipProps {
  /** The text, short; a control that shows an icon alone has it as its accessible name too. */
  text: string;
  /** The one control it is about. */
  children: ReactNode;
}

/**
 * A short text that appears over a control when the mouse rests on it or the keyboard focuses it,
 * and goes away as soon as it leaves, Esc is pressed or the control is pressed. The text repeats
 * the control's accessible name, or adds to it: it never carries anything that is only here.
 */
export function Tooltip({ text, children }: TooltipProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const show = () => {
    window.clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    if (open) lastClosedAt = performance.now();
    setOpen(false);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', hide, { capture: true, passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', hide, { capture: true });
    };
  });

  useLayoutEffect(() => {
    const control = wrapperRef.current?.firstElementChild;
    const tip = tipRef.current;
    if (!open || !control || !tip) return;
    const place = placePopup(
      control.getBoundingClientRect(),
      tip.getBoundingClientRect(),
      { width: window.innerWidth, height: window.innerHeight },
      { align: 'center', side: 'top', gap: 6 },
    );
    tip.style.top = `${place.top}px`;
    tip.style.left = `${place.left}px`;
  });

  const onPointerEnter = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType !== 'mouse') return;
    const warm = performance.now() - lastClosedAt < WARM_MS;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(show, warm ? 0 : SHOW_DELAY_MS);
  };
  const onFocus = (event: FocusEvent<HTMLSpanElement>) => {
    // The keyboard: a click gives the focus too, and the pointer says enough then.
    if (event.target.matches(':focus-visible')) show();
  };

  return (
    // No box of its own: the events of the control bubble through it.
    <span
      ref={wrapperRef}
      className="contents"
      onPointerEnter={onPointerEnter}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={onFocus}
      onBlur={hide}
    >
      {children}
      {open &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className="pointer-events-none fixed top-0 left-0 z-50 max-w-64 rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-fg shadow-lg"
          >
            {text}
          </div>,
          document.body,
        )}
    </span>
  );
}
