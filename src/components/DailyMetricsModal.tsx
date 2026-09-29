import { useState } from 'react';
import { Save, TrendingUp } from 'lucide-react';
import type { DailyMetric } from '../types';
import { formatLocaleNumber, parseLocaleNumber } from '../domain/numberFormat';
import { DAILY_METRIC } from '../domain/plan';
import {
  ITALIAN_MONTHS,
  formatDateToIT,
  formatDateToISO,
  getDaysInMonth,
  isWeekend,
} from '../utils/dateUtils';
import { Dialog } from './Dialog';

interface DailyMetricsModalProps {
  year: number;
  month: number;
  metrics: DailyMetric[];
  onClose: () => void;
  onSave: (metrics: DailyMetric[]) => void;
}

/** Edits the daily values of one month. Mounted only while open, so it always starts from saved data. */
export function DailyMetricsModal({
  year,
  month,
  metrics,
  onClose,
  onSave,
}: DailyMetricsModalProps) {
  const days = getDaysInMonth(year, month).map((date) => ({
    iso: formatDateToISO(date),
    weekend: isWeekend(date),
  }));

  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      metrics.map((metric) => [
        metric.date,
        formatLocaleNumber(metric.value, DAILY_METRIC.decimals),
      ]),
    ),
  );

  const invalidDates = days
    .map((day) => day.iso)
    .filter((iso) => {
      const draft = drafts[iso]?.trim();
      return draft !== undefined && draft !== '' && parseLocaleNumber(draft) === null;
    });

  const handleSave = () => {
    if (invalidDates.length > 0) return;
    const monthDates = new Set(days.map((day) => day.iso));
    const otherMonths = metrics.filter((metric) => !monthDates.has(metric.date));
    const thisMonth = days.flatMap((day) => {
      const value = parseLocaleNumber(drafts[day.iso] ?? '');
      return value === null ? [] : [{ date: day.iso, value }];
    });
    onSave([...otherMonths, ...thisMonth]);
    onClose();
  };

  return (
    <Dialog
      title={`${DAILY_METRIC.label} giornaliero`}
      description={`${ITALIAN_MONTHS[month]} ${year} · valori in ${DAILY_METRIC.unit}`}
      icon={
        <div className="p-2 bg-slate-200 text-slate-800 rounded-xl">
          <TrendingUp className="w-5 h-5" aria-hidden="true" />
        </div>
      }
      onClose={onClose}
      className="max-w-xl"
      footer={
        <>
          {invalidDates.length > 0 && (
            <p role="alert" className="basis-full text-xs text-rose-700">
              Correggi i valori non numerici del {invalidDates.map(formatDateToIT).join(', ')}.
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={invalidDates.length > 0}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            Salva
          </button>
        </>
      }
    >
      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
        {days.map((day) => {
          const invalid = invalidDates.includes(day.iso);
          return (
            <div
              key={day.iso}
              className={`flex items-center justify-between px-4 py-2 ${
                day.weekend ? 'bg-rose-50/50' : 'bg-white'
              }`}
            >
              <label htmlFor={`metric-${day.iso}`} className="flex items-center gap-2">
                <span className="w-20 font-mono font-bold text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-center">
                  {formatDateToIT(day.iso)}
                </span>
                <span className="text-xs text-slate-500">{day.weekend ? 'Weekend' : ''}</span>
              </label>
              <input
                id={`metric-${day.iso}`}
                type="text"
                inputMode="decimal"
                placeholder="es. 125.000"
                value={drafts[day.iso] ?? ''}
                aria-invalid={invalid}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [day.iso]: event.target.value }))
                }
                className={`w-40 min-w-0 px-2.5 py-1 text-xs text-right font-mono bg-white border rounded-md focus:outline-hidden focus:ring-1 ${
                  invalid
                    ? 'border-rose-400 focus:ring-rose-500'
                    : 'border-slate-300 focus:ring-slate-500'
                }`}
              />
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
