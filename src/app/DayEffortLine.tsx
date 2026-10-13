import { X } from 'lucide-react';
import { formatTeamEffort, totalEffort } from '../domain/dayEffort';
import type { TeamDayEffort } from '../domain/dayEffort';
import { formatLocaleNumber } from '../domain/numberFormat';
import { dayName } from '../features/calendar/timelineLayout';

interface DayEffortLineProps {
  /** The day chosen in the row of the days. */
  day: string;
  /** The days of effort of every team on it, in the order of the teams. */
  efforts: readonly TeamDayEffort[];
  /** Forgets the day: the line goes away. */
  onClear: () => void;
  /** On more lines when the line is too long, as on phones; otherwise cut, whole in its tip. */
  wrap?: boolean;
  className?: string;
}

/**
 * The effort of the teams on the day chosen at the top of the timeline, in the footer before the
 * version: «Effort mar 13 ott: BA:1, SSide:3, iOS:4 · totale 8». It is said again when the day
 * changes, and a button forgets the day.
 */
export function DayEffortLine({
  day,
  efforts,
  onClear,
  wrap = false,
  className = '',
}: DayEffortLineProps) {
  const teams = efforts.length > 0 ? formatTeamEffort(efforts) : 'nessun team nelle impostazioni';
  const total = totalEffort(efforts);
  const totalText = `totale ${formatLocaleNumber(total, Number.isInteger(total) ? 0 : 1)}`;
  return (
    <div className={`flex min-w-0 items-center gap-1 text-xs ${className}`}>
      <p
        role="status"
        title={`${teams} · ${totalText}`}
        className={`min-w-0 ${wrap ? 'text-center' : 'truncate'}`}
      >
        <span className="font-semibold">Effort {dayName(day)}:</span>{' '}
        <span className="tabular-nums">{teams}</span>
        <span className="text-fg-muted"> · {totalText}</span>
      </p>
      <button
        type="button"
        onClick={onClear}
        aria-label="Togli l'effort del giorno"
        title="Togli l'effort del giorno"
        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-surface-strong hover:text-fg"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
