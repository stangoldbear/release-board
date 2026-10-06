import { CalendarCheck, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ZoomLevel } from '../../domain/schedule';
import { Button } from '../../shared/ui/Button';
import { SEGMENT, SEGMENTED, SEGMENT_OFF, SEGMENT_ON } from '../../shared/ui/segmented';
import { startOfMonth, todayIso } from '../../utils/dateUtils';
import { periodLabel } from './calendarView';
import type { CalendarAction, CalendarView } from './calendarView';

interface CalendarNavProps {
  view: CalendarView;
  onViewAction: (action: CalendarAction) => void;
  /** Without the past, the timeline has nothing before the current month. */
  hidePastDays: boolean;
}

/** The three zoom levels of the timeline, then the board of one week. */
const VIEW_OPTIONS: {
  key: ZoomLevel | 'week';
  label: string;
  title: string;
}[] = [
  { key: 'detail', label: 'Dettaglio', title: 'Colonne larghe, un giorno per colonna' },
  { key: 'month', label: 'Mese', title: 'Un giorno per colonna' },
  { key: 'quarter', label: 'Trimestre', title: 'Una settimana per colonna' },
  { key: 'week', label: 'Bacheca', title: 'Una settimana, con le attività in schede' },
];

/** The month or week in view, with the arrows and Today, then the views of the calendar. */
export function CalendarNav({ view, onViewAction, hidePastDays }: CalendarNavProps) {
  const activeView = view.mode === 'week' ? 'week' : view.zoom;
  const onBoard = view.mode === 'week';
  const canGoBack =
    onBoard || !hidePastDays || startOfMonth(view.anchor) > startOfMonth(todayIso());

  return (
    <>
      <nav aria-label="Periodo" className={`${SEGMENTED} gap-1`}>
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

      <div role="group" aria-label="Vista" className={SEGMENTED}>
        {VIEW_OPTIONS.map(({ key, label, title }) => (
          <button
            key={key}
            type="button"
            title={title}
            aria-pressed={activeView === key}
            onClick={() =>
              onViewAction(
                key === 'week' ? { type: 'setMode', mode: 'week' } : { type: 'setZoom', zoom: key },
              )
            }
            className={`${SEGMENT} ${activeView === key ? SEGMENT_ON : SEGMENT_OFF}`}
          >
            {activeView === key && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
