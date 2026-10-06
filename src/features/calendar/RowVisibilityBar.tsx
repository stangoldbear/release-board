import { useId } from 'react';
import { ArrowRightFromLine, Eye, EyeOff, History, RotateCcw } from 'lucide-react';
import { DAILY_METRIC } from '../../domain/plan';
import type { Lane } from '../../domain/types';
import { ToggleChip } from '../../shared/ui/ToggleChip';
import type { CalendarDisplay, CalendarDisplayControls } from './useCalendarDisplay';

interface RowVisibilityBarProps {
  lanes: Lane[];
  display: CalendarDisplay;
  controls: CalendarDisplayControls;
  /** On the timeline, the past days can be hidden; the board shows one week. */
  onTimeline: boolean;
}

/**
 * Under the calendar: the rows to show, the revenue first, then the lanes and the notes; on the
 * right, the holidays and weekends in red and the past days.
 */
export function RowVisibilityBar({ lanes, display, controls, onTimeline }: RowVisibilityBarProps) {
  const labelId = useId();
  const { visibility } = display;
  const options = [
    {
      key: 'metrics',
      label: DAILY_METRIC.label,
      visible: display.showMetrics,
      toggle: controls.toggleMetrics,
    },
    ...lanes.map((lane) => ({
      key: lane.id,
      label: lane.name,
      visible: !visibility.hiddenLaneIds.includes(lane.id),
      toggle: () => controls.toggleLane(lane.id),
    })),
    { key: 'notes', label: 'Note', visible: visibility.showNotes, toggle: controls.toggleNotes },
  ];
  const allVisible = options.every((option) => option.visible);

  return (
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 bg-surface px-4 py-2.5 select-none">
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap items-center gap-3">
        <span id={labelId} className="text-xs font-bold tracking-wide uppercase">
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
              onClick={controls.showAllRows}
              className="ml-1 flex cursor-pointer items-center gap-1 text-xs font-medium text-link hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Mostra tutte
            </button>
          )}
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <ToggleChip pressed={display.highlightWeekends} onClick={controls.toggleWeekends}>
          <span className="h-2 w-2 shrink-0 rounded-full bg-holiday-fg" aria-hidden="true" />
          Festivi e weekend
        </ToggleChip>
        {onTimeline && (
          <ToggleChip pressed={display.hidePastDays} onClick={controls.togglePastDays}>
            <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Nascondi giorni passati
          </ToggleChip>
        )}
        {onTimeline && (
          <ToggleChip
            pressed={display.oneLineTitles}
            onClick={controls.toggleOneLineTitles}
            title="Titoli interi su una riga, anche oltre il rettangolo; barre e note alte una riga"
          >
            <ArrowRightFromLine className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Titoli su una riga
          </ToggleChip>
        )}
      </div>
    </div>
  );
}
