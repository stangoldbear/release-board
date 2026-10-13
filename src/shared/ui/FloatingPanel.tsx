import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { GripHorizontal, X } from 'lucide-react';
import { keepInView, placeBeside } from './popup';

interface FloatingPanelProps {
  /** The name of the panel, in its bar. */
  title: string;
  /** The control that opened it: the panel opens beside it, and the focus goes back to it. */
  anchor: HTMLElement;
  /** What the panel opens beside, when not the control alone: the group of tools it is in. */
  beside?: HTMLElement;
  onClose: () => void;
  /** The width of the panel, as a class; a fixed width, so that it can be placed before it shows. */
  widthClass?: string;
  children: ReactNode;
}

/** The panel as the window sees it, to keep it in view. */
function viewportSize() {
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * A small window over the page, opened by a control and left open until its X or Esc closes it:
 * it opens beside the control, its bar moves it around with the mouse or a finger, and it stays
 * where it was put while the page scrolls. It takes the focus when it opens, and gives it back to
 * the control when it closes. Not modal: the page under it keeps working. While open, the content
 * can change, as another control shows its details in it, and the panel stays where it is.
 */
export function FloatingPanel({
  title,
  anchor,
  beside = anchor,
  onClose,
  widthClass = 'w-80',
  children,
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Where the panel is: written on the element, so that a move draws nothing else.
  const place = useRef<{ top: number; left: number } | null>(null);
  const drag = useRef<{ x: number; y: number; top: number; left: number } | null>(null);

  const putAt = (next: { top: number; left: number }) => {
    const panel = panelRef.current;
    if (!panel) return;
    place.current = keepInView(next, panel.getBoundingClientRect(), viewportSize());
    panel.style.top = `${place.current.top}px`;
    panel.style.left = `${place.current.left}px`;
  };

  // Placed before it shows, beside the control that opened it; then it stays where it is put,
  // kept in view as its content changes.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    putAt(
      place.current ??
        placeBeside(beside.getBoundingClientRect(), panel.getBoundingClientRect(), viewportSize()),
    );
  });

  useEffect(() => {
    panelRef.current?.focus();
    // A smaller window must not leave it out of sight.
    const onResize = () => {
      if (place.current) putAt(place.current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const close = () => {
    onClose();
    if (anchor.isConnected) anchor.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  };

  const startMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!place.current || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ...place.current };
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    putAt({ top: start.top + event.clientY - start.y, left: start.left + event.clientX - start.x });
  };
  const endMove = () => {
    drag.current = null;
  };

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={`fixed top-0 left-0 z-50 flex max-h-[calc(100dvh-16px)] ${widthClass} max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-xl border border-line bg-surface text-fg shadow-2xl transition-opacity duration-150 starting:opacity-0 focus-visible:outline-2 focus-visible:outline-link`}
    >
      {/* The bar: it moves the panel, and holds its name and the button that closes it. */}
      <div
        onPointerDown={startMove}
        onPointerMove={move}
        onPointerUp={endMove}
        onPointerCancel={endMove}
        title="Trascina per spostare"
        className="flex shrink-0 cursor-move touch-none items-center gap-2 border-b border-line bg-surface-muted py-1 pr-1 pl-3 select-none"
      >
        <GripHorizontal className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
        <h2 id={titleId} className="min-w-0 flex-1 truncate text-xs font-semibold text-fg-muted">
          {title}
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="Chiudi"
          title="Chiudi"
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-surface-strong hover:text-fg"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 overflow-y-auto p-3">{children}</div>
    </div>,
    document.body,
  );
}
