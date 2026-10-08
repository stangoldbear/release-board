import { useState } from 'react';
import { CalendarCheck, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ZoomLevel } from '../../domain/schedule';
import { Button } from '../../shared/ui/Button';
import { SEGMENT, SEGMENTED, SEGMENT_OFF, SEGMENT_ON } from '../../shared/ui/segmented';
import { startOfMonth, todayIso } from '../../utils/dateUtils';
import { MIN_FIT_DAYS, daysInView, maxFitDays, periodLabel } from './calendarView';
import type { CalendarAction, CalendarView } from './calendarView';

interface CalendarNavProps {
  view: CalendarView;
  onViewAction: (action: CalendarAction) => void;
  /** Without the past, the timeline has nothing before the current month. */
  hidePastDays: boolean;
  /** The name of the period controls, which tells them apart from those of another area. */
  name?: string;
  /** Whether the board of one week is among the views: the roadmap has only the timeline. */
  board?: boolean;
}

/** The four fixed zoom levels, the fitted one, then the board of one week. */
const VIEW_OPTIONS: {
  key: ZoomLevel | 'week';
  label: string;
  title: string;
}[] = [
  { key: 'detail', label: 'Dettaglio', title: 'Colonne larghe, un giorno per colonna' },
  { key: 'month', label: 'Mese', title: 'Un giorno per colonna' },
  { key: 'bimester', label: '2 mesi', title: 'Un giorno per colonna, largo la metà' },
  { key: 'quarter', label: 'Trimestre', title: 'Una settimana per colonna' },
  {
    key: 'fit',
    label: 'Mostra N giorni',
    title:
      'Tanti giorni interi quanti ne mostra la finestra con la vista attuale, senza giorni tagliati; poi il numero si può cambiare',
  },
  { key: 'week', label: 'Bacheca', title: 'Una settimana, con le attività in schede' },
];

/**
 * The number of days of the fitted level. A number typed within the limits takes effect at once;
 * one outside them is brought within them when the field loses the focus.
 */
function FitDaysField({
  view,
  onChange,
}: {
  view: CalendarView;
  onChange: (days: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const most = view.viewport === null ? undefined : maxFitDays(view.viewport);
  const within = (days: number) =>
    Number.isInteger(days) && days >= MIN_FIT_DAYS && (most === undefined || days <= most);
  return (
    <input
      type="number"
      inputMode="numeric"
      min={MIN_FIT_DAYS}
      max={most}
      step={1}
      value={draft ?? String(view.fitDays)}
      aria-label="Giorni da mostrare"
      title={`Da ${MIN_FIT_DAYS}${most === undefined ? '' : ` a ${most}`} giorni, tutti interi nella finestra`}
      onChange={(event) => {
        setDraft(event.target.value);
        const days = Number(event.target.value);
        if (within(days)) onChange(days);
      }}
      onBlur={() => {
        const days = Number(draft);
        if (draft !== null && draft !== '' && Number.isFinite(days)) onChange(days);
        setDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
      className="w-12 rounded-md border border-line-strong bg-surface px-1 py-0.5 text-center text-xs font-semibold text-fg tabular-nums"
    />
  );
}

/** The month or week in view, with the arrows and Today, then the views of the calendar. */
export function CalendarNav({
  view,
  onViewAction,
  hidePastDays,
  name = 'Periodo',
  board = true,
}: CalendarNavProps) {
  const activeView = view.mode === 'week' ? 'week' : view.zoom;
  const onBoard = view.mode === 'week';
  const canGoBack =
    onBoard || !hidePastDays || startOfMonth(view.anchor) > startOfMonth(todayIso());
  const options = board ? VIEW_OPTIONS : VIEW_OPTIONS.filter((option) => option.key !== 'week');
  // Whole days in the window at the level in use; the fitted level shows the days it was given.
  const days = daysInView(view) ?? view.fitDays;

  return (
    <>
      <nav aria-label={name} className={`${SEGMENTED} gap-1`}>
        <Button
          variant="ghost"
          size="icon"
          className="p-1.5"
          disabled={!canGoBack}
          onClick={() => onViewAction({ type: 'previous' })}
          aria-label={onBoard ? 'Settimana precedente' : 'Mese precedente'}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span
          aria-live="polite"
          className="min-w-32 px-1 text-center text-xs font-bold tracking-wide uppercase"
        >
          {periodLabel(view)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="p-1.5"
          onClick={() => onViewAction({ type: 'next' })}
          aria-label={onBoard ? 'Settimana successiva' : 'Mese successivo'}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          onClick={() => onViewAction({ type: 'goTo', date: todayIso() })}
          title={onBoard ? 'Mostra la settimana di oggi' : 'Porta oggi al bordo sinistro'}
        >
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Oggi
        </Button>
      </nav>

      {/* Wrapping, so that on a phone the six views take two rows rather than widen the page. */}
      <div
        role="group"
        aria-label={`Vista: ${name.toLowerCase()}`}
        className={`${SEGMENTED} flex-wrap gap-y-1`}
      >
        {options.map(({ key, label, title }) => {
          if (key === 'fit' && activeView === 'fit') {
            // The chosen fitted level: its button, then the number of days to change.
            return (
              <span
                key={key}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${SEGMENT_ON}`}
              >
                <button
                  type="button"
                  title={title}
                  aria-pressed="true"
                  className="inline-flex cursor-default items-center gap-1"
                >
                  <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                  Mostra
                  <span className="sr-only"> {days} giorni</span>
                </button>
                <FitDaysField
                  view={view}
                  onChange={(fitDays) => onViewAction({ type: 'setFitDays', days: fitDays })}
                />
                <span aria-hidden="true">giorni</span>
              </span>
            );
          }
          return (
            <button
              key={key}
              type="button"
              title={title}
              aria-pressed={activeView === key}
              onClick={() =>
                onViewAction(
                  key === 'week'
                    ? { type: 'setMode', mode: 'week' }
                    : { type: 'setZoom', zoom: key },
                )
              }
              className={`${SEGMENT} ${activeView === key ? SEGMENT_ON : SEGMENT_OFF}`}
            >
              {activeView === key && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
              {key === 'fit' ? `Mostra ${days} giorni` : label}
            </button>
          );
        })}
      </div>
    </>
  );
}
