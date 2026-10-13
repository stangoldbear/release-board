import { useId } from 'react';
import type { ButtonHTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import type { PopupAlign } from './popup';
import { usePopup } from './usePopup';

/** A line of a menu: an action, a switch, one of a few choices, a separator or a heading. */
export type MenuItem =
  | {
      kind?: 'item';
      label: string;
      icon?: LucideIcon;
      onSelect: () => void;
      disabled?: boolean;
      /** Why it is disabled, or what it does beyond its label. */
      hint?: string;
      danger?: boolean;
    }
  | {
      kind: 'check';
      label: string;
      icon?: LucideIcon;
      checked: boolean;
      onToggle: () => void;
      disabled?: boolean;
      hint?: string;
    }
  | {
      kind: 'radio';
      label: string;
      icon?: LucideIcon;
      checked: boolean;
      onSelect: () => void;
      disabled?: boolean;
      hint?: string;
    }
  | { kind: 'separator' }
  | { kind: 'heading'; label: string };

interface MenuProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  /** The name of the menu; the button's too, when it shows an icon alone. */
  label: string;
  items: MenuItem[];
  align?: PopupAlign;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'icon';
  /** The small arrow after the content of the button; off for an icon-only button. */
  chevron?: boolean;
  /** The content of the button. */
  children: ReactNode;
}

const ITEM_CLASS =
  'flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-strong focus-visible:bg-surface-strong focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

/**
 * A button that opens a list of actions or choices under it, as a dropdown menu: a click, Enter,
 * Space or the arrows open it; the arrows move between the items and wrap, Home and End go to the
 * ends; Esc and Tab close it and give the focus back to the button. An action closes the menu;
 * a switch keeps it open, so that several can be turned in a row.
 */
export function Menu({
  label,
  items,
  align = 'start',
  variant = 'secondary',
  size = 'sm',
  chevron = true,
  children,
  className = '',
  ...buttonProps
}: MenuProps) {
  const { open, setOpen, dismiss, triggerRef, panelRef } = usePopup({ align });
  const menuId = useId();

  const enabledItems = () =>
    [...(panelRef.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]') ?? [])].filter(
      (item) => !item.disabled,
    );
  const focusItem = (at: 'first' | 'last') => {
    // After the panel is in the document.
    window.requestAnimationFrame(() => {
      const list = enabledItems();
      (at === 'first' ? list[0] : list.at(-1))?.focus();
    });
  };
  const openAt = (at: 'first' | 'last') => {
    setOpen(true);
    focusItem(at);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openAt(event.key === 'ArrowDown' ? 'first' : 'last');
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = enabledItems();
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        list[(index + step + list.length) % list.length]?.focus();
        break;
      }
      case 'Home':
      case 'End':
        event.preventDefault();
        (event.key === 'Home' ? list[0] : list.at(-1))?.focus();
        break;
      case 'Escape':
      case 'Tab':
        event.preventDefault();
        dismiss();
        break;
      default:
    }
  };

  return (
    <>
      <Button
        ref={triggerRef}
        variant={variant}
        size={size}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={chevron ? undefined : label}
        onClick={() => (open ? setOpen(false) : openAt('first'))}
        onKeyDown={handleTriggerKeyDown}
        className={className}
        {...buttonProps}
      >
        {children}
        {chevron && <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />}
      </Button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={handleMenuKeyDown}
            className="fixed top-0 left-0 z-50 max-h-[calc(100dvh-16px)] min-w-48 max-w-[calc(100vw-16px)] overflow-y-auto rounded-xl border border-line bg-surface py-1 text-fg shadow-2xl"
          >
            {items.map((item, index) => {
              if (item.kind === 'separator') {
                return <hr key={index} role="separator" className="my-1 border-line" />;
              }
              if (item.kind === 'heading') {
                return (
                  <p
                    key={index}
                    role="presentation"
                    className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-fg-muted uppercase"
                  >
                    {item.label}
                  </p>
                );
              }
              const Icon = item.icon;
              const checked = item.kind === 'check' || item.kind === 'radio' ? item.checked : null;
              return (
                <button
                  key={index}
                  type="button"
                  role={
                    item.kind === 'check'
                      ? 'menuitemcheckbox'
                      : item.kind === 'radio'
                        ? 'menuitemradio'
                        : 'menuitem'
                  }
                  aria-checked={checked ?? undefined}
                  disabled={item.disabled}
                  title={item.hint}
                  onClick={() => {
                    if (item.kind === 'check') {
                      item.onToggle();
                      return;
                    }
                    item.onSelect();
                    dismiss();
                  }}
                  className={`${ITEM_CLASS} ${item.kind !== 'check' && item.kind !== 'radio' && item.danger ? 'text-danger' : ''}`}
                >
                  {checked !== null && (
                    <span className="flex w-4 shrink-0 justify-center" aria-hidden="true">
                      {checked && <Check className="h-4 w-4" />}
                    </span>
                  )}
                  {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  <span className="min-w-0 flex-1">{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
