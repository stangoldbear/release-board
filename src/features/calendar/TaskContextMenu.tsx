import { useEffect, useEffectEvent, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Copy, Pen, Trash } from 'lucide-react';
import type { TaskItem } from '../../domain/types';

interface TaskContextMenuProps {
  task: TaskItem;
  /** Where it opens, in viewport coordinates. */
  x: number;
  y: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const MENU_WIDTH = 224;
const MENU_HEIGHT = 170;

/**
 * Actions on a task, opened with a right click or the context menu key. Arrow keys move between
 * the items; Esc, Tab or a click elsewhere close it.
 */
export function TaskContextMenu({
  task,
  x,
  y,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
}: TaskContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const closeOnOutsidePress = useEffectEvent((event: PointerEvent) => {
    if (!menuRef.current?.contains(event.target as Node)) onClose();
  });

  useEffect(() => {
    menuRef.current?.querySelector('button')?.focus();
    const handlePointerDown = (event: PointerEvent) => closeOnOutsidePress(event);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleKeyDown = (event: KeyboardEvent) => {
    const items = [...(menuRef.current?.querySelectorAll('button') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      items[(index + step + items.length) % items.length]?.focus();
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      onClose();
    }
  };

  const item = (label: string, Icon: typeof Copy, action: () => void, danger = false) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        action();
        onClose();
      }}
      className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-strong focus-visible:bg-surface-strong ${
        danger ? 'text-danger' : ''
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Azioni per ${task.title}`}
      onKeyDown={handleKeyDown}
      style={{
        top: Math.max(8, Math.min(y, window.innerHeight - MENU_HEIGHT)),
        left: Math.max(8, Math.min(x, window.innerWidth - MENU_WIDTH)),
        width: MENU_WIDTH,
      }}
      className="fixed z-50 overflow-hidden rounded-xl border border-line bg-surface py-1 text-fg shadow-2xl"
    >
      <p className="truncate border-b border-line px-3 py-1.5 text-xs font-semibold text-fg-muted">
        {task.title.replace(/\s+/g, ' ')}
      </p>
      {item('Modifica dettagli', Pen, onEdit)}
      {item('Duplica', Copy, onDuplicate)}
      {item('Elimina…', Trash, onDelete, true)}
    </div>
  );
}
