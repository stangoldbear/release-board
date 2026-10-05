import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  Plus,
  Search,
  Settings,
  TrendingUp,
} from 'lucide-react';
import type { TaskFilter } from '../domain/filters';
import { DAILY_METRIC, TASK_STATUSES, TASK_STATUS_LABELS } from '../domain/plan';
import type { ZoomLevel } from '../domain/schedule';
import type { TaskStatus } from '../domain/types';
import { periodLabel } from '../features/calendar/calendarView';
import type { CalendarAction, CalendarView } from '../features/calendar/calendarView';
import { CompactToggle, TextSizeControls } from '../features/calendar/DisplayControls';
import type { TextScale } from '../features/calendar/timelineLayout';
import { AppLogo } from '../shared/ui/AppLogo';
import { Button } from '../shared/ui/Button';
import { startOfMonth, todayIso } from '../utils/dateUtils';

interface HeaderProps {
  view: CalendarView;
  onViewAction: (action: CalendarAction) => void;
  filters: TaskFilter;
  onFilterChange: (filters: TaskFilter) => void;
  highlightWeekends: boolean;
  showMetrics: boolean;
  hidePastDays: boolean;
  /** Size of the calendar's text. */
  textScale: TextScale;
  onTextScaleChange: (scale: TextScale) => void;
  /** Compact mode of the calendar. */
  compact: boolean;
  onToggleCompact: () => void;
  onToggleWeekends: () => void;
  onToggleMetrics: () => void;
  onToggleHidePastDays: () => void;
  onNewTask: () => void;
  onOpenSettings: () => void;
  onOpenMetrics: () => void;
  onImportMetrics: () => void;
  /** The synchronization indicator, in a shared instance. */
  syncIndicator?: ReactNode;
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

const SEGMENTED = 'flex items-center rounded-xl border border-line bg-surface-strong p-1';
const SEGMENT = 'cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors';
const SEGMENT_ON = 'bg-surface text-fg shadow-xs';
const SEGMENT_OFF = 'text-fg-muted hover:text-fg';

function ToggleChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
        pressed
          ? 'border-link bg-accent-soft font-semibold text-fg'
          : 'border-line-strong bg-surface text-fg-muted hover:text-fg'
      }`}
    >
      {/* On, it shows a check: not only another color. */}
      {pressed && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** The button that adds a task, where the focus goes when a task is deleted. */
export const NEW_TASK_ID = 'new-task';

export function Header({
  view,
  onViewAction,
  filters,
  onFilterChange,
  highlightWeekends,
  showMetrics,
  hidePastDays,
  textScale,
  onTextScaleChange,
  compact,
  onToggleCompact,
  onToggleWeekends,
  onToggleMetrics,
  onToggleHidePastDays,
  onNewTask,
  onOpenSettings,
  onOpenMetrics,
  onImportMetrics,
  syncIndicator,
}: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null);
  useStickyHeight(headerRef);
  const activeView = view.mode === 'week' ? 'week' : view.zoom;
  const onBoard = view.mode === 'week';
  // Without the past, the timeline has nothing before the current month.
  const canGoBack =
    onBoard || !hidePastDays || startOfMonth(view.anchor) > startOfMonth(todayIso());

  return (
    // On phones the header wraps to several lines: it scrolls away instead of covering the calendar.
    <header
      ref={headerRef}
      className="z-40 border-b border-line bg-surface shadow-xs sm:sticky sm:top-0"
    >
      <div className="space-y-3 px-4 py-3 sm:px-6">
        {/* One line from 1280 pixels: below 1536 the subtitle and some labels give way. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 2xl:gap-x-5">
          <div className="flex items-center gap-2.5">
            <AppLogo size={36} />
            <div>
              <h1 className="text-base leading-none font-extrabold">Release Board</h1>
              <p className="mt-0.5 hidden text-xs text-fg-muted 2xl:block">
                Pianificazione di rilasci e attività
              </p>
            </div>
          </div>

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
                    key === 'week'
                      ? { type: 'setMode', mode: 'week' }
                      : { type: 'setZoom', zoom: key },
                  )
                }
                className={`${SEGMENT} ${activeView === key ? SEGMENT_ON : SEGMENT_OFF}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* On phones the magnifiers are in the settings, so that the calendar stays in view. */}
            <div className="max-sm:hidden">
              <TextSizeControls textScale={textScale} onChange={onTextScaleChange} />
            </div>
            <CompactToggle compact={compact} onToggle={onToggleCompact} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {syncIndicator}
            <Button id={NEW_TASK_ID} variant="primary" onClick={onNewTask}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuova attività
            </Button>
            <Button
              size="icon"
              onClick={onOpenSettings}
              aria-label="Impostazioni"
              title="Impostazioni"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex max-w-lg flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cerca in attività, note e note libere"
                placeholder="Cerca in attività e note…"
                value={filters.search}
                onChange={(event) => onFilterChange({ ...filters, search: event.target.value })}
                className="w-full rounded-lg border border-line-strong bg-surface py-1.5 pr-3 pl-9 text-xs placeholder:text-fg-muted"
              />
            </div>
            <select
              aria-label="Filtra per stato"
              value={filters.status ?? ''}
              onChange={(event) =>
                onFilterChange({
                  ...filters,
                  status: event.target.value === '' ? null : (event.target.value as TaskStatus),
                })
              }
              className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs"
            >
              <option value="">Tutti gli stati</option>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ToggleChip pressed={highlightWeekends} onClick={onToggleWeekends}>
              <span className="h-2 w-2 rounded-full bg-holiday-fg" aria-hidden="true" />
              Festivi e weekend
            </ToggleChip>
            {!onBoard && (
              <ToggleChip pressed={hidePastDays} onClick={onToggleHidePastDays}>
                <History className="h-3.5 w-3.5" aria-hidden="true" />
                Nascondi giorni passati
              </ToggleChip>
            )}
            <ToggleChip pressed={showMetrics} onClick={onToggleMetrics}>
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              {DAILY_METRIC.label}
            </ToggleChip>
            {showMetrics && (
              <>
                <button
                  type="button"
                  onClick={onOpenMetrics}
                  className="cursor-pointer text-xs font-semibold text-link underline"
                >
                  Modifica valori
                </button>
                <button
                  type="button"
                  onClick={onImportMetrics}
                  className="cursor-pointer text-xs font-semibold text-link underline"
                >
                  Importa da file
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Keeps --header-height on the page equal to the height of the fixed header, so that the page
 * scrolls a focused element out from under it (scroll-padding-top in index.css).
 */
function useStickyHeight(ref: { current: HTMLElement | null }): void {
  useLayoutEffect(() => {
    const header = ref.current;
    if (!header) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() =>
      root.style.setProperty('--header-height', `${header.offsetHeight}px`),
    );
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--header-height');
    };
  }, [ref]);
}
