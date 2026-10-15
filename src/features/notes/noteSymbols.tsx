import type { TaskColorId } from '../../domain/colors';
import { taskColorStyle } from '../../themes';

// The symbols of the notes that have a day, on the timeline, in the agenda and in the settings:
// a diamond for a note on the timeline, a flag for the note of a day of Next Releases, a post-it
// (a pile when there are several) for the free notes of Notes. The shape says where a note comes
// from. Each is filled with the strong tone of its color and outlined with the color of its text,
// which stands out from any page at 3:1 at least. Decorative: who shows one names it.

/** The fill and the outline of a symbol; without a color, the page's own. */
function tones(colorId: TaskColorId | undefined): { fill: string; stroke: string } {
  if (!colorId) return { fill: 'var(--color-surface)', stroke: 'var(--color-fg)' };
  const style = taskColorStyle(colorId);
  return { fill: String(style.borderColor), stroke: String(style.color) };
}

interface SymbolProps {
  colorId: TaskColorId | undefined;
  /** The side, in pixels. */
  size?: number;
  className?: string;
}

/** A note on the timeline. */
export function DiamondSymbol({ colorId, size = 14, className = '' }: SymbolProps) {
  const { fill, stroke } = tones(colorId);
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={`shrink-0 ${className}`}
    >
      <path
        d="M8 1.2 14.8 8 8 14.8 1.2 8Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The note of a day of Next Releases. */
export function FlagSymbol({ colorId, size = 16, className = '' }: SymbolProps) {
  const { fill, stroke } = tones(colorId);
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={`shrink-0 ${className}`}
    >
      <path d="M3.4 1.4v13.2" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M4.2 2.1h9.3l-2.4 3.4 2.4 3.4H4.2Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** How far each sheet of a pile is from the one under it. */
const PILE_STEP = 3;

/**
 * The free notes of a day: one post-it, or a pile of up to three in the colors of the first
 * notes, the first on top.
 */
export function PostitSymbol({
  colorIds,
  size = 16,
  className = '',
}: {
  colorIds: readonly (TaskColorId | undefined)[];
  size?: number;
  className?: string;
}) {
  const sheets = colorIds.slice(0, 3);
  const extra = (sheets.length - 1) * PILE_STEP;
  const side = 16 + extra;
  return (
    <svg
      aria-hidden="true"
      width={(size * side) / 16}
      height={(size * side) / 16}
      viewBox={`0 0 ${side} ${side}`}
      className={`shrink-0 ${className}`}
    >
      {/* The last sheet first, at the back, up and to the right; the first in front. */}
      {[...sheets].reverse().map((colorId, back) => {
        const offset = (sheets.length - 1 - back) * PILE_STEP;
        const top = back === sheets.length - 1;
        const { fill, stroke } = tones(colorId);
        return (
          <g key={back} transform={`translate(${offset} ${extra - offset})`}>
            <path
              d="M1.6 1.6h12.8v8.6l-4.2 4.2H1.6Z"
              fill={fill}
              stroke={stroke}
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            {top && (
              <path
                d="M14.4 10.2h-4.2v4.2"
                fill="none"
                stroke={stroke}
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
