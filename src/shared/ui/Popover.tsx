import { useEffect, useId } from 'react';
import type { ButtonHTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import type { PopupAlign } from './popup';
import { usePopup } from './usePopup';

interface PopoverProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The name of the panel; the button's too, when it shows an icon alone. */
  label: string;
  /** What the panel holds: text, a legend, a few controls. */
  panel: ReactNode;
  align?: PopupAlign;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'icon';
  /** Width of the panel, as a Tailwind class. */
  panelClassName?: string;
  /** The content of the button. */
  children: ReactNode;
}

/**
 * A button that opens a panel of content next to it, which stays until dismissed: for help, a
 * legend, a few settings. The panel takes the focus when it opens; Esc gives it back to the
 * button, and the focus leaving the panel closes it.
 */
export function Popover({
  label,
  panel,
  align = 'end',
  variant = 'secondary',
  size = 'sm',
  panelClassName = 'w-80',
  children,
  className = '',
  ...buttonProps
}: PopoverProps) {
  const { open, setOpen, dismiss, triggerRef, panelRef } = usePopup({ align });
  const panelId = useId();

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open, panelRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    }
  };

  return (
    <>
      <Button
        ref={triggerRef}
        variant={variant}
        size={size}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={label}
        onClick={() => setOpen(!open)}
        className={className}
        {...buttonProps}
      >
        {children}
      </Button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={label}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            onBlur={(event) => {
              const next = event.relatedTarget as Node | null;
              if (next && !panelRef.current?.contains(next) && next !== triggerRef.current) {
                setOpen(false);
              }
            }}
            className={`fixed top-0 left-0 z-50 max-h-[calc(100dvh-16px)] max-w-[calc(100vw-16px)] overflow-y-auto rounded-xl border border-line bg-surface p-4 text-sm text-fg shadow-2xl focus-visible:outline-none ${panelClassName}`}
          >
            {panel}
          </div>,
          document.body,
        )}
    </>
  );
}
