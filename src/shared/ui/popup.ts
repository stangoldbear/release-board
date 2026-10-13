// Where a panel that pops up from a control goes: under it, or over it when there is no room, kept
// inside the window. Pure, so that the menus, the popovers and the tooltips share it.

/** A box on the screen, as `getBoundingClientRect` gives it. */
export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type PopupAlign = 'start' | 'center' | 'end';
export type PopupSide = 'bottom' | 'top';

export interface PopupOptions {
  /** Which edge of the trigger the panel lines up with; `center` for a tooltip. */
  align?: PopupAlign;
  /** The side the panel prefers; it flips to the other when that side has no room. */
  side?: PopupSide;
  /** Space between the trigger and the panel. */
  gap?: number;
  /** The least space between the panel and the edges of the window. */
  margin?: number;
}

export interface Placement {
  top: number;
  left: number;
  /** The panel ended up over the trigger. */
  above: boolean;
}

/** The place of a panel next to its trigger, inside a window of the given size. */
export function placePopup(
  trigger: Box,
  panel: Size,
  viewport: Size,
  { align = 'start', side = 'bottom', gap = 4, margin = 8 }: PopupOptions = {},
): Placement {
  const below = trigger.top + trigger.height + gap;
  const over = trigger.top - gap - panel.height;
  const fitsBelow = below + panel.height <= viewport.height - margin;
  const fitsAbove = over >= margin;
  const above = side === 'top' ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;
  // Taller than the room on both sides: from the top margin, where most of it shows.
  const top = !fitsBelow && !fitsAbove ? margin : Math.max(margin, above ? over : below);

  const wanted =
    align === 'start'
      ? trigger.left
      : align === 'end'
        ? trigger.left + trigger.width - panel.width
        : trigger.left + trigger.width / 2 - panel.width / 2;
  const left = Math.max(margin, Math.min(wanted, viewport.width - panel.width - margin));

  return { top, left, above };
}
