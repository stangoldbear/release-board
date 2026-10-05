import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChartColumn, Table2 } from 'lucide-react';
import { HISTORY_KINDS, HISTORY_KIND_LABELS } from '../../domain/history';
import { niceCeiling } from '../../domain/historyStats';
import type { HistoryBucket, HistoryStats } from '../../domain/historyStats';
import { Button } from '../../shared/ui/Button';
import { HoverCard, useHoverCard } from '../../shared/ui/HoverCard';
import { formatDateToIT } from '../../utils/dateUtils';
import { KindIcon, shortDay } from './historyUi';

/** At most this many labels along the time axis. */
const AXIS_LABELS = 8;

function bucketName(bucket: HistoryBucket, unit: HistoryStats['unit']): string {
  return unit === 'day'
    ? formatDateToIT(bucket.start)
    : `Settimana dal ${formatDateToIT(bucket.start)} al ${formatDateToIT(bucket.end)}`;
}

function changes(count: number): string {
  return `${count} ${count === 1 ? 'modifica' : 'modifiche'}`;
}

function BucketDetails({ bucket, unit }: { bucket: HistoryBucket; unit: HistoryStats['unit'] }) {
  return (
    <div>
      <p className="text-xs text-fg-muted">{bucketName(bucket, unit)}</p>
      <p className="mt-0.5 text-base font-bold">{changes(bucket.count)}</p>
      {bucket.count > 0 && (
        <ul className="mt-2 space-y-1 border-t border-line pt-2 text-xs">
          {HISTORY_KINDS.filter((kind) => bucket.byKind[kind]).map((kind) => (
            <li key={kind} className="flex items-center gap-2">
              <KindIcon kind={kind} className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
              <span className="flex-1">{HISTORY_KIND_LABELS[kind]}</span>
              <strong className="tabular-nums">{bucket.byKind[kind]}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The changes per day, or per week for long periods, as columns of one color. Resting on a column
 * or tapping it shows its count by kind; the same numbers are in the table view.
 */
export function ActivityChart({ stats }: { stats: HistoryStats }) {
  const [asTable, setAsTable] = useState(false);
  const { card, triggerProps, cardProps } = useHoverCard<HistoryBucket>();
  const { buckets, unit } = stats;
  const top = niceCeiling(Math.max(0, ...buckets.map((bucket) => bucket.count)));
  const ticks = top % 2 === 0 ? [top, top / 2, 0] : [top, 0];
  const labelEvery = Math.ceil(buckets.length / AXIS_LABELS);
  const busiest = buckets.reduce<HistoryBucket | null>(
    (best, bucket) => (bucket.count > (best?.count ?? 0) ? bucket : best),
    null,
  );
  const title = unit === 'day' ? 'Modifiche per giorno' : 'Modifiche per settimana';
  const summary = `${title}: ${changes(stats.total)} in tutto${
    busiest ? `, al massimo ${busiest.count} (${bucketName(busiest, unit)})` : ''
  }.`;

  return (
    <figure className="rounded-xl border border-line bg-surface p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <figcaption>
          <h2 className="text-sm font-bold">{title}</h2>
          <p className="text-xs text-fg-muted">
            Passa sopra una colonna, o toccala, per vedere cosa è cambiato.
          </p>
        </figcaption>
        <Button size="sm" aria-pressed={asTable} onClick={() => setAsTable((value) => !value)}>
          {asTable ? (
            <ChartColumn className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {asTable ? 'Grafico' : 'Tabella'}
        </Button>
      </div>

      {asTable ? (
        <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-surface-muted text-fg-muted">
              <tr>
                <th scope="col" className="px-2 py-1.5 font-semibold">
                  {unit === 'day' ? 'Giorno' : 'Settimana'}
                </th>
                <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                  Modifiche
                </th>
                {HISTORY_KINDS.map((kind) => (
                  <th key={kind} scope="col" className="px-2 py-1.5 text-right font-semibold">
                    {HISTORY_KIND_LABELS[kind]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {[...buckets].reverse().map((bucket) => (
                <tr key={bucket.start}>
                  <th scope="row" className="px-2 py-1 font-normal whitespace-nowrap">
                    {unit === 'day'
                      ? formatDateToIT(bucket.start)
                      : `${formatDateToIT(bucket.start)} – ${formatDateToIT(bucket.end)}`}
                  </th>
                  <td className="px-2 py-1 text-right font-semibold">{bucket.count}</td>
                  {HISTORY_KINDS.map((kind) => (
                    <td key={kind} className="px-2 py-1 text-right text-fg-muted">
                      {bucket.byKind[kind] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
          <div className="relative h-44 w-6 text-right text-xs text-fg-muted tabular-nums">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 -translate-y-1/2"
                style={{ top: `${(1 - tick / top) * 100}%` }}
              >
                {tick}
              </span>
            ))}
          </div>
          <div className="relative h-44" role="img" aria-label={summary}>
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute inset-x-0 border-t border-line"
                style={{ top: `${(1 - tick / top) * 100}%` }}
              />
            ))}
            {/* The whole height of a column answers the pointer, not only its bar. */}
            <div className="absolute inset-0 flex items-end">
              {buckets.map((bucket) => (
                <div
                  key={bucket.start}
                  {...triggerProps(bucket)}
                  className="group flex h-full min-w-0 flex-1 cursor-pointer items-end justify-center px-px"
                >
                  <div
                    className="w-full max-w-6 rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-75"
                    style={{ height: `${(bucket.count / top) * 100}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div />
          <div className="mt-1 flex text-xs text-fg-muted" aria-hidden="true">
            {buckets.map((bucket, index) => (
              <span
                key={bucket.start}
                className="flex min-w-0 flex-1 justify-center whitespace-nowrap"
              >
                {index % labelEvery === 0 ? shortDay(bucket.start) : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {card && (
        <HoverCard
          anchor={card.anchor}
          cardRef={cardProps.cardRef}
          onPointerEnter={cardProps.onPointerEnter}
          onPointerLeave={cardProps.onPointerLeave}
        >
          <BucketDetails bucket={card.item} unit={unit} />
        </HoverCard>
      )}
    </figure>
  );
}

interface BreakdownProps {
  title: string;
  rows: { key: string; label: string; count: number; icon?: ReactNode }[];
}

/** Counts by author or by kind, as horizontal bars of one color with the value at the tip. */
export function Breakdown({ title, rows }: BreakdownProps) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-xs">
      <h2 className="text-sm font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-fg-muted">Nessuna modifica nel periodo.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li
              key={row.key}
              className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-3 text-xs"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {row.icon}
                <span className="truncate">{row.label}</span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="h-3 rounded-r-[4px] bg-accent"
                  style={{ width: `calc((100% - 3rem) * ${row.count / max})` }}
                />
                <span className="font-semibold tabular-nums">{row.count}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
