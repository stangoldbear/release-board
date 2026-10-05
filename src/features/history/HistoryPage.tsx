import { useEffect, useState } from 'react';
import { ArrowLeft, History } from 'lucide-react';
import type { HistoryReader } from '../../app/HistoryReader';
import { HISTORY_KINDS, HISTORY_KIND_LABELS, historyKind } from '../../domain/history';
import type { HistoryEntry, HistoryKind } from '../../domain/history';
import {
  HISTORY_PERIOD_LABELS,
  entryDay,
  historyStats,
  periodStart,
} from '../../domain/historyStats';
import type { HistoryPeriod } from '../../domain/historyStats';
import type { Lane } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { VersionStamp } from '../../shared/ui/VersionStamp';
import { formatDateToIT, parseISODate, todayIso } from '../../utils/dateUtils';
import { ActivityChart, Breakdown } from './ActivityChart';
import { HistoryList } from './HistoryList';
import { KindIcon, dayHeading, timeOf } from './historyUi';

/** Changes loaded at a time; "Mostra altre" loads as many more. */
const PAGE_SIZE = 500;

const FIELD =
  'rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs text-fg focus-visible:outline-2';

interface HistoryPageProps {
  /** Null where the changes are not recorded: the app without an account. */
  history: HistoryReader | null;
  lanes: Lane[];
  onBack: () => void;
}

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {detail && <p className="mt-0.5 truncate text-xs text-fg-muted">{detail}</p>}
    </div>
  );
}

/**
 * Every change to the plan, with day, time and author: counts, a chart of the changes over time,
 * the most active people and kinds of change, and the list, all scoped by the filters on top.
 */
export function HistoryPage({ history, lanes, onBack }: HistoryPageProps) {
  const [period, setPeriod] = useState<HistoryPeriod>('30');
  const [author, setAuthor] = useState('');
  const [kind, setKind] = useState<HistoryKind | ''>('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const today = todayIso();
  const since = period === 'all' ? null : periodStart(period, today);
  const queryKey = `${since ?? 'all'}:${limit}`;
  // The entries with the query they answer: while a new query loads, the old ones stay, dimmed.
  const [loaded, setLoaded] = useState<{ key: string; entries: HistoryEntry[] } | null>(null);

  useEffect(() => {
    if (!history) return;
    return history.subscribeHistory(
      { limit, since: since ? parseISODate(since) : undefined },
      (entries) => setLoaded({ key: queryKey, entries }),
    );
  }, [history, limit, since, queryKey]);

  const entries = loaded?.entries ?? [];
  const stale = loaded !== null && loaded.key !== queryKey;
  const authors = [...new Set(entries.map((entry) => entry.actor.login))].sort();
  const shown = entries.filter(
    (entry) => (!author || entry.actor.login === author) && (!kind || historyKind(entry) === kind),
  );
  const oldest = entries.at(-1);
  const start = since ?? (oldest ? entryDay(oldest, today) : today);
  const stats = historyStats(shown, start, today);
  const busiest = stats.buckets.reduce<(typeof stats.buckets)[number] | null>(
    (best, bucket) => (bucket.count > (best?.count ?? 0) ? bucket : best),
    null,
  );
  const latest = shown[0];
  const laneName = (id: string) => lanes.find((lane) => lane.id === id)?.name;

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-fg">
      <header className="border-b border-line bg-surface shadow-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Button onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Calendario
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-on-accent">
              <History className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base leading-none font-extrabold">Cronologia delle modifiche</h1>
              <p className="mt-0.5 text-xs text-fg-muted">
                Chi ha cambiato cosa, giorno e ora, in tempo reale
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 space-y-4 px-4 py-5 sm:px-6">
        {!history ? (
          <section className="rounded-xl border border-line bg-surface p-6 text-sm shadow-xs">
            <h2 className="font-bold">La cronologia c&apos;è con l&apos;istanza condivisa</h2>
            <p className="mt-1 text-fg-muted">
              Qui l&apos;app tiene i dati solo in questo browser e non registra le modifiche. Con un
              progetto Firebase ogni modifica viene registrata con l&apos;autore, il giorno e
              l&apos;ora.
            </p>
          </section>
        ) : (
          <>
            <div
              role="group"
              aria-label="Filtri della cronologia"
              className="flex flex-wrap items-center gap-2"
            >
              <select
                aria-label="Periodo"
                value={period}
                onChange={(event) => setPeriod(event.target.value as HistoryPeriod)}
                className={FIELD}
              >
                {(Object.keys(HISTORY_PERIOD_LABELS) as HistoryPeriod[]).map((value) => (
                  <option key={value} value={value}>
                    {HISTORY_PERIOD_LABELS[value]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Autore"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                className={FIELD}
              >
                <option value="">Tutti gli autori</option>
                {authors.map((login) => (
                  <option key={login} value={login}>
                    {login}
                  </option>
                ))}
              </select>
              <select
                aria-label="Tipo di modifica"
                value={kind}
                onChange={(event) => setKind(event.target.value as HistoryKind | '')}
                className={FIELD}
              >
                <option value="">Tutti i tipi</option>
                {HISTORY_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {HISTORY_KIND_LABELS[value]}
                  </option>
                ))}
              </select>
              {(author || kind) && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthor('');
                    setKind('');
                  }}
                  className="cursor-pointer text-xs font-semibold text-link underline"
                >
                  Togli i filtri
                </button>
              )}
            </div>

            {loaded === null ? (
              <p className="text-sm text-fg-muted" role="status">
                Caricamento della cronologia…
              </p>
            ) : (
              // While a new period loads, the previous numbers stay, dimmed, without jumping.
              <div
                className={`space-y-4 transition-opacity ${stale ? 'opacity-60' : ''}`}
                aria-busy={stale}
              >
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatTile
                    label="Modifiche"
                    value={stats.total.toLocaleString('it-IT')}
                    detail={
                      since
                        ? `dal ${formatDateToIT(since)}`
                        : oldest
                          ? `dal ${formatDateToIT(start)}`
                          : undefined
                    }
                  />
                  <StatTile
                    label="Autori"
                    value={String(stats.authors.length)}
                    detail={stats.authors[0] ? `più attivo: ${stats.authors[0].login}` : undefined}
                  />
                  <StatTile
                    label={stats.unit === 'day' ? 'Giorno più attivo' : 'Settimana più attiva'}
                    value={busiest ? String(busiest.count) : '—'}
                    detail={
                      busiest
                        ? stats.unit === 'day'
                          ? dayHeading(busiest.start, today)
                          : `dal ${formatDateToIT(busiest.start)}`
                        : undefined
                    }
                  />
                  <StatTile
                    label="Ultima modifica"
                    value={latest?.at ? timeOf(latest.at) : latest ? 'Adesso' : '—'}
                    detail={
                      latest
                        ? `${dayHeading(entryDay(latest, today), today)} · ${latest.actor.login}`
                        : undefined
                    }
                  />
                </div>

                <ActivityChart stats={stats} />

                <div className="grid gap-4 lg:grid-cols-2">
                  <Breakdown
                    title="Per autore"
                    rows={stats.authors.map(({ login, count }) => ({
                      key: login,
                      label: login,
                      count,
                    }))}
                  />
                  <Breakdown
                    title="Per tipo"
                    rows={stats.kinds.map(({ kind: rowKind, count }) => ({
                      key: rowKind,
                      label: HISTORY_KIND_LABELS[rowKind],
                      count,
                      icon: (
                        <KindIcon kind={rowKind} className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
                      ),
                    }))}
                  />
                </div>

                <section className="rounded-xl border border-line bg-surface p-4 shadow-xs">
                  <h2 className="mb-3 text-sm font-bold">Tutte le modifiche</h2>
                  {shown.length === 0 ? (
                    <p className="text-sm text-fg-muted">Nessuna modifica con questi filtri.</p>
                  ) : (
                    <HistoryList entries={shown} today={today} laneName={laneName} />
                  )}
                  {entries.length >= limit && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-xs text-fg-muted">
                      <span>
                        Sono caricate le {limit.toLocaleString('it-IT')} modifiche più recenti
                        {since ? ' del periodo' : ''}: i conteggi riguardano solo queste.
                      </span>
                      <Button size="sm" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                        Carica le precedenti
                      </Button>
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="w-full px-4 pb-5 sm:px-6">
        <VersionStamp />
      </footer>
    </div>
  );
}
