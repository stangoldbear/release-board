import type { CSSProperties } from 'react';

/**
 * Sizes of the text of the notes and the calendars, as multiples of the normal one: the
 * magnifiers in the header step through them. Below 1 the text goes under 12 pixels, by choice of
 * whoever wants more on the screen; the normal size keeps it at 12.
 */
export const TEXT_SCALES = [0.75, 0.85, 1, 1.15, 1.3, 1.5, 1.75] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

/** Line height of the scaled text, as a multiple of its size; compact mode tightens it. */
export const LINE_HEIGHT = { normal: 4 / 3, compact: 1.15 };

/**
 * The text of an area at a size and a density, for the element around its content. Tailwind's
 * text-xs, text-sm and text-base read these variables, so they scale only inside it, while the
 * header, the buttons and the dialogs keep their size. Letters spread a little as they grow, and
 * draw closer as they shrink.
 */
export function scaledTextStyle(textScale: number, compact: boolean): CSSProperties {
  const style: Record<string, string> = {
    '--text-xs': `${0.75 * textScale}rem`,
    '--text-sm': `${0.875 * textScale}rem`,
    '--text-base': `${textScale}rem`,
    letterSpacing: `${Math.round((textScale - 1) * 40) / 1000}em`,
  };
  if (compact) {
    for (const size of ['xs', 'sm', 'base']) {
      style[`--text-${size}--line-height`] = String(LINE_HEIGHT.compact);
    }
  }
  return style;
}
