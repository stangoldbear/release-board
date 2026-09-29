import { useId, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  title: string;
  /** Short line under the title. */
  description?: string;
  /** Decoration shown before the title. */
  icon?: ReactNode;
  /** Actions pinned under the content, so they stay in view while the content scrolls. */
  footer?: ReactNode;
  /** Extra classes for the dialog box, typically its maximum width. */
  className?: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Modal dialog on the browser <dialog>: it keeps focus inside, closes with Esc or a click on the
 * backdrop, and gives focus back to what opened it. It always fits the screen: the header and the
 * footer stay in view and only the content scrolls, while the page behind it is locked (index.css).
 *
 * Mount it only while it is open: unmounting closes it.
 */
export function Dialog({
  title,
  description,
  icon,
  footer,
  className = '',
  onClose,
  children,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // Closing through the browser, rather than just removing the element, restores focus.
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={(event) => {
        // React also hands `close` to ancestor dialogs. And in development StrictMode remounts the
        // dialog, so the event of that first close arrives when it is already open again.
        if (event.target === event.currentTarget && !event.currentTarget.open) onClose();
      }}
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // Only presses that start on the backdrop: a text selection dragged out of a field ends
        // with a click on the dialog too.
        if (pressStartedOnBackdrop.current && event.target === event.currentTarget) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl backdrop:bg-slate-900/60 backdrop:backdrop-blur-xs open:flex ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon}
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>

      {footer && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          {footer}
        </div>
      )}
    </dialog>
  );
}
