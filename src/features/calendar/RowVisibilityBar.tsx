import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import type { Lane, RowVisibility } from '../../domain/types';

interface RowVisibilityBarProps {
  lanes: Lane[];
  visibility: RowVisibility;
  onToggleLane: (laneId: string) => void;
  onToggleNotes: () => void;
  onShowAll: () => void;
}

export function RowVisibilityBar({
  lanes,
  visibility,
  onToggleLane,
  onToggleNotes,
  onShowAll,
}: RowVisibilityBarProps) {
  const options = [
    ...lanes.map((lane) => ({
      key: lane.id,
      label: lane.name,
      visible: !visibility.hiddenLaneIds.includes(lane.id),
      toggle: () => onToggleLane(lane.id),
    })),
    { key: 'notes', label: 'Note', visible: visibility.showNotes, toggle: onToggleNotes },
  ];
  const allVisible = options.every((option) => option.visible);

  return (
    <div
      role="group"
      aria-labelledby="row-visibility-label"
      className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 shadow-2xs select-none"
    >
      <span id="row-visibility-label" className="text-xs font-bold tracking-wide uppercase">
        Righe visibili
      </span>

      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={option.toggle}
            aria-pressed={option.visible}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors ${
              option.visible
                ? 'border-line-strong bg-surface text-fg hover:bg-surface-strong'
                : 'border-dashed border-line-strong bg-surface-muted text-fg-muted line-through hover:bg-surface-strong'
            }`}
          >
            {option.visible ? (
              <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            {option.label}
          </button>
        ))}

        {!allVisible && (
          <button
            type="button"
            onClick={onShowAll}
            className="ml-1 flex cursor-pointer items-center gap-1 text-xs font-medium text-link hover:underline"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Mostra tutte
          </button>
        )}
      </div>
    </div>
  );
}
