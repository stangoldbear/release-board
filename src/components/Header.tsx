import {
  Calendar as CalendarIcon,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Plus,
  Search,
  Settings,
  TrendingUp,
} from 'lucide-react';
import type { FilterOptions, TaskStatus, ViewMode } from '../types';
import { DAILY_METRIC, TASK_STATUSES, TASK_STATUS_LABELS } from '../domain/plan';
import { ITALIAN_MONTHS } from '../utils/dateUtils';

interface HeaderProps {
  year: number;
  month: number;
  viewMode: ViewMode;
  filters: FilterOptions;
  highlightWeekends: boolean;
  showMetrics: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onChangeViewMode: (mode: ViewMode) => void;
  onFilterChange: (filters: FilterOptions) => void;
  onToggleWeekends: () => void;
  onToggleMetrics: () => void;
  onNewTask: () => void;
  onOpenSettings: () => void;
  onOpenMetrics: () => void;
}

const VIEW_MODES: { mode: ViewMode; label: string; Icon: typeof LayoutGrid }[] = [
  { mode: 'month', label: 'Mese', Icon: LayoutGrid },
  { mode: 'week', label: 'Settimana', Icon: CalendarIcon },
];

export function Header({
  year,
  month,
  viewMode,
  filters,
  highlightWeekends,
  showMetrics,
  onPrevMonth,
  onNextMonth,
  onToday,
  onChangeViewMode,
  onFilterChange,
  onToggleWeekends,
  onToggleMetrics,
  onNewTask,
  onOpenSettings,
  onOpenMetrics,
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <CalendarRange className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 leading-none">
                  Release Board
                </h1>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Pianificazione di rilasci e attività
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={onPrevMonth}
                className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors"
                aria-label="Mese precedente"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <div className="px-2 font-bold text-xs text-slate-800 tracking-wide uppercase min-w-[120px] text-center">
                {ITALIAN_MONTHS[month]} {year}
              </div>
              <button
                type="button"
                onClick={onNextMonth}
                className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors"
                aria-label="Mese successivo"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onToday}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                Oggi
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div
              role="group"
              aria-label="Vista"
              className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold"
            >
              {VIEW_MODES.map(({ mode, label, Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChangeViewMode(mode)}
                  aria-pressed={viewMode === mode}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    viewMode === mode
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onNewTask}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Nuova attività
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Impostazioni"
              title="Impostazioni"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 mt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search
                className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cerca attività"
                placeholder="Cerca per titolo, assegnatario o note…"
                value={filters.search}
                onChange={(event) => onFilterChange({ ...filters, search: event.target.value })}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-400 focus:bg-white transition-all"
              />
            </div>

            <select
              aria-label="Filtra per stato"
              value={filters.status}
              onChange={(event) =>
                onFilterChange({ ...filters, status: event.target.value as TaskStatus | '' })
              }
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-400"
            >
              <option value="">Tutti gli stati</option>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            <button
              type="button"
              onClick={onToggleWeekends}
              aria-pressed={highlightWeekends}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                highlightWeekends
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true" />
              Festivi e weekend
            </button>

            <button
              type="button"
              onClick={onToggleMetrics}
              aria-pressed={showMetrics}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                showMetrics
                  ? 'bg-blue-50 border-blue-200 text-blue-900 font-medium'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              {DAILY_METRIC.label}
            </button>

            {showMetrics && (
              <button
                type="button"
                onClick={onOpenMetrics}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
              >
                Modifica valori
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
