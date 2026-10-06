import { useState } from 'react';
import type { DragEvent } from 'react';

/** The direction of a list: a row (x) or a column (y). */
export type Axis = 'x' | 'y';

/**
 * The slot under the pointer, over the item at `index` of a list: before it, the slot `index`,
 * when the pointer is on its first half along the list, otherwise after it.
 */
export function slotAt(
  index: number,
  box: { left: number; top: number; width: number; height: number },
  pointer: { x: number; y: number },
  axis: Axis,
): number {
  const before =
    axis === 'x' ? pointer.x < box.left + box.width / 2 : pointer.y < box.top + box.height / 2;
  return before ? index : index + 1;
}

/** Where an item at `from` ends up when dropped in `slot`: the slot counts the item itself. */
export function indexForSlot(slot: number, from: number): number {
  return slot > from ? slot - 1 : slot;
}

/**
 * Moves items to another place of their list with the browser's drag and drop. The items travel
 * with a type of their own, so that nothing else lands among them, and only within the list they
 * come from. `slot` says where the dragged item would land: before the item at that index of the
 * list, or after the last one.
 */
export function useListDrag(
  type: string,
  onMove: (id: string, list: string, index: number) => void,
) {
  const [dragged, setDragged] = useState<{ id: string; list: string } | null>(null);
  const [drop, setDrop] = useState<{ list: string; slot: number } | null>(null);

  const end = () => {
    setDragged(null);
    setDrop(null);
  };

  /** The props of an item that can be dragged, from `list`. */
  const source = (id: string, list: string) => ({
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.setData(type, id);
      event.dataTransfer.effectAllowed = 'move';
      setDragged({ id, list });
    },
    onDragEnd: end,
  });

  /**
   * The props of the item at `index` of a list, whose items have `ids`: the dragged item lands
   * before it or after it, by the half of it under the pointer.
   */
  const target = (list: string, ids: readonly string[], index: number, axis: Axis) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (dragged?.list !== list || !event.dataTransfer.types.includes(type)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const pointer = { x: event.clientX, y: event.clientY };
      const slot = slotAt(index, event.currentTarget.getBoundingClientRect(), pointer, axis);
      if (drop?.list !== list || drop.slot !== slot) setDrop({ list, slot });
    },
    onDrop: (event: DragEvent) => {
      if (dragged?.list !== list) return;
      event.preventDefault();
      if (drop?.list === list) {
        const from = ids.indexOf(dragged.id);
        const to = indexForSlot(drop.slot, from);
        if (from >= 0 && to !== from) onMove(dragged.id, list, to);
      }
      end();
    },
  });

  /** The props of the element around a list: leaving it clears the slot. */
  const container = {
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrop(null);
    },
  };

  return {
    /** The id of the item being dragged. */
    dragged: dragged?.id ?? null,
    /** Where the dragged item would land in `list`, if it is over it. */
    slot: (list: string) => (drop?.list === list ? drop.slot : null),
    source,
    target,
    container,
  };
}
