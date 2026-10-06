import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

interface ToggleChipProps {
  pressed: boolean;
  onClick: () => void;
  /** What the chip does, beyond its label. */
  title?: string;
  /** A name that tells it apart from another chip with the same label; it holds the label. */
  label?: string;
  children: ReactNode;
}

/** A switch shaped as a chip. On, it shows a check: not only another color. */
export function ToggleChip({ pressed, onClick, title, label, children }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      title={title}
      className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
        pressed
          ? 'border-link bg-accent-soft font-semibold text-fg'
          : 'border-line-strong bg-surface text-fg-muted hover:text-fg'
      }`}
    >
      {pressed && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}
