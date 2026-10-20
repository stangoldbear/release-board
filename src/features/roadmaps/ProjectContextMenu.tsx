import { useEffect, useEffectEvent, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Info } from 'lucide-react';

interface ProjectContextMenuProps {
  title: string;
  x: number;
  y: number;
  canDuplicate: boolean;
  onShowInfo: () => void;
  onDuplicate: () => void;
  onClose: () => void;
}

export function ProjectContextMenu({
  title,
  x,
  y,
  canDuplicate,
  onShowInfo,
  onDuplicate,
  onClose,
}: ProjectContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useEffectEvent(onClose);
  const outside = useEffectEvent((event: PointerEvent) => {
    if (!menuRef.current?.contains(event.target as Node)) onClose();
  });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const bounds = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8))}px`;
    menu.querySelector('button')?.focus({ preventScroll: true });
  }, [x, y]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => outside(event);
    const handleResize = () => close();
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent) => {
    const items = [
      ...(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []),
    ].filter((item) => !item.disabled);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    event.stopPropagation();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      items[(index + step + items.length) % items.length]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      (event.key === 'Home' ? items[0] : items.at(-1))?.focus();
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      onClose();
    }
  };

  const itemClass =
    'flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-strong focus-visible:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-50';

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Azioni per ${title}`}
      onKeyDown={handleKeyDown}
      style={{ left: x, top: y, width: 224 }}
      className="fixed z-50 max-h-[calc(100dvh-16px)] max-w-[calc(100vw-16px)] overflow-auto rounded-lg border border-line bg-surface py-1 text-fg shadow-2xl"
    >
      <p className="truncate border-b border-line px-3 py-1.5 text-xs font-semibold text-fg-muted">
        {title.replace(/\s+/g, ' ')}
      </p>
      <button type="button" role="menuitem" onClick={onShowInfo} className={itemClass}>
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        Mostra informazioni
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!canDuplicate}
        title={
          canDuplicate
            ? undefined
            : 'Servono le regole di sicurezza aggiornate per duplicare il team'
        }
        onClick={onDuplicate}
        className={itemClass}
      >
        <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
        Duplica
      </button>
    </div>,
    document.body,
  );
}
