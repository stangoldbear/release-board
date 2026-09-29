import { useState } from 'react';
import { Save, TrendingUp } from 'lucide-react';
import type { DailyMetric } from '../../domain/types';
import { formatLocaleNumber, parseLocaleNumber } from '../../domain/numberFormat';
import { DAILY_METRIC } from '../../domain/plan';
import type { MetricValueChange } from '../../domain/plan';
import {
  ITALIAN_MONTHS,
  formatDateToIT,
  formatDateToISO,
  getDaysInMonth,
  isWeekend,
} from '../../utils/dateUtils';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { FIELD_CLASS } from '../../shared/ui/field';

interface DailyMetricsDialogProps {
  year: number;
  month: number;
  metrics: DailyMetric[];
  onClose: () => void;
  onSave: (changes: MetricValueChange[]) => void;
}

/** Edits the daily values of one month. Mounted only while open, so it always starts from saved data. */
export function DailyMetricsDialog({
  year,
  month,
  metrics,
  onClose,
  onSave,
}: DailyMetricsDialogProps) {
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
    onSave(days.map((day) => ({ date: day.iso, value: parseLocaleNumber(drafts[day.iso] ?? '') })));
    onClose();
  };

  return (
    <Dialog
      title={`${DAILY_METRIC.label} giornaliero`}
      description={`${ITALIAN_MONTHS[month]} ${year} · valori in ${DAILY_METRIC.unit}`}
      icon={
        <div className="rounded-xl bg-surface-strong p-2 text-fg">
          <TrendingUp className="h-5 w-5" aria-hidden="true" />
        </div>
      }
      onClose={onClose}
      className="max-w-xl"
      footer={
        <>
          {invalidDates.length > 0 && (
            <p role="alert" className="basis-full text-xs text-danger">
              Correggi i valori non numerici del {invalidDates.map(formatDateToIT).join(', ')}.
            </p>
          )}
          <Button onClick={onClose}>Annulla</Button>
          <Button variant="primary" onClick={handleSave} disabled={invalidDates.length > 0}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Salva
          </Button>
        </>
      }
    >
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {days.map((day) => {
          const invalid = invalidDates.includes(day.iso);
          return (
            <div
              key={day.iso}
              className={`flex items-center justify-between gap-3 px-4 py-2 ${
                day.weekend ? 'bg-holiday' : 'bg-surface'
              }`}
            >
              <label htmlFor={`metric-${day.iso}`} className="flex items-center gap-2 text-xs">
                <span className="w-24 rounded border border-line bg-surface-muted px-1.5 py-0.5 text-center font-mono font-bold">
                  {formatDateToIT(day.iso)}
                </span>
                <span className="text-fg-muted">{day.weekend ? 'Weekend' : ''}</span>
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
                className={`${FIELD_CLASS} w-40 min-w-0 py-1 text-right font-mono`}
              />
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
