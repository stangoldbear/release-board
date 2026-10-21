import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Info } from 'lucide-react';

export function useBarMenu(
  name: string,
  onInfo: (anchor: HTMLElement) => void,
  onDuplicate?: () => void,
) {
  const [position, setPosition] = useState<{ x: number; y: number; anchor: HTMLElement } | null>(
    null,
  );
  const open = (anchor: HTMLElement, x?: number, y?: number) => {
    const rect = anchor.getBoundingClientRect();
    setPosition({ anchor, x: x || rect.left, y: y || rect.bottom });
  };
  const onContextMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    open(event.currentTarget, event.clientX, event.clientY);
  };
  const onMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return false;
    event.preventDefault();
    open(event.currentTarget);
    return true;
  };
  return {
    onContextMenu,
    onMenuKeyDown,
    menu: position && (
      <BarMenu
        name={name}
        position={position}
        onInfo={() => onInfo(position.anchor)}
        onDuplicate={onDuplicate}
        onClose={() => setPosition(null)}
      />
    ),
  };
}

function BarMenu({
  name,
  position,
  onInfo,
  onDuplicate,
  onClose,
}: {
  name: string;
  position: { x: number; y: number; anchor: HTMLElement };
  onInfo: () => void;
  onDuplicate?: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const outside = useEffectEvent((event: PointerEvent) => {
    if (!ref.current?.contains(event.target as Node)) onClose();
  });
  useEffect(() => {
    ref.current?.querySelector('button')?.focus();
    const listener = (event: PointerEvent) => outside(event);
    document.addEventListener('pointerdown', listener);
    return () => document.removeEventListener('pointerdown', listener);
  }, []);
  const close = () => {
    onClose();
    if (position.anchor.isConnected) position.anchor.focus();
  };
  const keyDown = (event: KeyboardEvent) => {
    const buttons = [
      ...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []),
    ];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? buttons.length - 1
            : (at + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };
  const itemClass =
    'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-strong focus-visible:bg-surface-strong disabled:cursor-default disabled:text-fg-muted';
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={`Azioni per ${name}`}
      onKeyDown={keyDown}
      style={{
        left: Math.max(8, Math.min(position.x, window.innerWidth - 240)),
        top: Math.max(8, Math.min(position.y, window.innerHeight - 128)),
      }}
      className="fixed z-50 w-56 max-w-[calc(100vw-16px)] overflow-hidden rounded-lg border border-line bg-surface py-1 text-fg shadow-xl"
    >
      <p className="truncate border-b border-line px-3 py-1 text-xs font-semibold text-fg-muted">
        {name}
      </p>
      <button
        type="button"
        role="menuitem"
        className={itemClass}
        onClick={() => {
          onClose();
          onInfo();
        }}
      >
        <Info className="h-4 w-4" aria-hidden="true" />
        Mostra informazioni
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!onDuplicate}
        className={itemClass}
        onClick={() => {
          close();
          onDuplicate?.();
        }}
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
        Duplica
      </button>
    </div>,
    document.body,
  );
}
