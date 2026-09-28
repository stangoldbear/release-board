import { Check, Eye, EyeOff, RotateCcw } from 'lucide-react';
import type { Lane, RowVisibility } from '../types';

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
      isNote: false,
      visible: !visibility.hiddenLaneIds.includes(lane.id),
      toggle: () => onToggleLane(lane.id),
    })),
    {
      key: 'notes',
      label: 'Note',
      isNote: true,
      visible: visibility.showNotes,
      toggle: onToggleNotes,
    },
  ];
  const allVisible = options.every((option) => option.visible);

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-2xs px-4 py-2.5 flex flex-wrap items-center gap-3 select-none">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 tracking-wide uppercase">
        <Eye className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
        <span>Righe visibili:</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={option.toggle}
            aria-pressed={option.visible}
            className={`group px-3 py-1.5 text-xs font-extrabold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              option.visible
                ? option.isNote
                  ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-xs hover:bg-amber-100'
                  : 'bg-white text-slate-900 border-slate-300 shadow-xs hover:bg-slate-50'
                : 'bg-slate-100 text-slate-500 border-dashed border-slate-300 hover:bg-slate-200/80 hover:text-slate-700'
            }`}
          >
            {option.visible ? (
              <Check
                className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]"
                aria-hidden="true"
              />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            )}
            <span className={`tracking-wider uppercase ${option.visible ? '' : 'line-through'}`}>
              {option.label}
            </span>
          </button>
        ))}

        {!allVisible && (
          <button
            type="button"
            onClick={onShowAll}
            className="ml-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            Mostra tutte
          </button>
        )}
      </div>
    </div>
  );
}
