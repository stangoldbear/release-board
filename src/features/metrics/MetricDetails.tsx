import { CircleCheck, OctagonAlert, TriangleAlert } from 'lucide-react';
import { APPROVAL_LABELS } from '../../domain/approval';
import { formatLocaleNumber } from '../../domain/numberFormat';
import { DAILY_METRIC } from '../../domain/plan';
import type { DateRange } from '../../domain/schedule';
import type { ApprovalLight, DailyMetric } from '../../domain/types';
import { formatDateToIT, parseISODate } from '../../utils/dateUtils';

/** Text and background of a value, by the approval light of its day. */
export const APPROVAL_TONE: Record<ApprovalLight, string> = {
  green: 'bg-approval-green-soft text-approval-green',
  orange: 'bg-approval-orange-soft text-approval-orange',
  red: 'bg-approval-red-soft text-approval-red',
};

const APPROVAL_ICONS = { green: CircleCheck, orange: TriangleAlert, red: OctagonAlert };

/** A shape for each light, so that the color is never the only cue. */
export function ApprovalIcon({ light, className }: { light: ApprovalLight; className?: string }) {
  const Icon = APPROVAL_ICONS[light];
  return <Icon className={className ?? 'h-3 w-3 shrink-0'} aria-hidden="true" />;
}

/** The value as precise as it was saved: cents only when there are any. */
export function preciseValue(value: number): string {
  const decimals = Number.isInteger(value) ? DAILY_METRIC.decimals : 2;
  return `${formatLocaleNumber(value, decimals)} ${DAILY_METRIC.unit}`;
}

function longDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Everything the card shows about a day, as one sentence for screen readers. */
export function describeDay(metric: DailyMetric): string {
  const parts = [
    `${DAILY_METRIC.label} del ${formatDateToIT(metric.date)}: ${preciseValue(metric.value)}`,
  ];
  if (metric.approval) {
    const { name, meaning } = APPROVAL_LABELS[metric.approval];
    parts.push(`semaforo ${name.toLowerCase()}, ${meaning.toLowerCase()}`);
  }
  if (metric.promoEu) parts.push(`promo EU: ${metric.promoEu}`);
  if (metric.promoNonEu) parts.push(`promo non EU: ${metric.promoNonEu}`);
  return parts.join('; ');
}

function ApprovalLine({ light }: { light: ApprovalLight }) {
  const { name, meaning } = APPROVAL_LABELS[light];
  return (
    <p
      className={`mt-2 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-xs ${APPROVAL_TONE[light]}`}
    >
      <ApprovalIcon light={light} className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>
        <strong className="font-semibold">Semaforo {name.toLowerCase()}</strong> · {meaning}
      </span>
    </p>
  );
}

function Promotions({ metric }: { metric: DailyMetric }) {
  if (!metric.promoEu && !metric.promoNonEu) return null;
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {metric.promoEu && (
        <>
          <dt className="text-fg-muted">Promo EU</dt>
          <dd className="font-medium wrap-break-word">{metric.promoEu}</dd>
        </>
      )}
      {metric.promoNonEu && (
        <>
          <dt className="text-fg-muted">Promo non EU</dt>
          <dd className="font-medium wrap-break-word">{metric.promoNonEu}</dd>
        </>
      )}
    </dl>
  );
}

/** The details of one day: exact value, approval light and promotions. */
export function DayDetails({ metric }: { metric: DailyMetric }) {
  return (
    <div>
      <p className="text-xs text-fg-muted first-letter:uppercase">{longDate(metric.date)}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums">{preciseValue(metric.value)}</p>
      <p className="text-xs text-fg-muted">{DAILY_METRIC.label}</p>
      {metric.approval && <ApprovalLine light={metric.approval} />}
      <Promotions metric={metric} />
    </div>
  );
}

/** The days of a week column, in the quarter view: total, then each day in short. */
export function WeekDetails({ week, days }: { week: DateRange; days: DailyMetric[] }) {
  const total = days.reduce((sum, day) => sum + day.value, 0);
  return (
    <div>
      <p className="text-xs text-fg-muted">
        Dal {formatDateToIT(week.start)} al {formatDateToIT(week.end)}
      </p>
      <p className="mt-0.5 text-base font-bold tabular-nums">{preciseValue(total)}</p>
      <p className="text-xs text-fg-muted">{DAILY_METRIC.label} della settimana</p>
      <ul className="mt-2 space-y-1 border-t border-line pt-2 text-xs">
        {days.map((day) => (
          <li key={day.date} className="flex items-start gap-2">
            <span className="w-16 shrink-0 text-fg-muted first-letter:uppercase">
              {parseISODate(day.date).toLocaleDateString('it-IT', {
                weekday: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 tabular-nums">
                {day.approval && (
                  <span className={`rounded-sm p-0.5 ${APPROVAL_TONE[day.approval]}`}>
                    <ApprovalIcon light={day.approval} />
                    <span className="sr-only">Semaforo {APPROVAL_LABELS[day.approval].name}</span>
                  </span>
                )}
                {preciseValue(day.value)}
              </span>
              {(day.promoEu || day.promoNonEu) && (
                <span className="block text-fg-muted wrap-break-word">
                  {[
                    day.promoEu && `EU: ${day.promoEu}`,
                    day.promoNonEu && `non EU: ${day.promoNonEu}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
