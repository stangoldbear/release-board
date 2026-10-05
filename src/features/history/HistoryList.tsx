import { useState } from 'react';
import { describeChange, fieldChanges, historyKind } from '../../domain/history';
import type { HistoryEntry } from '../../domain/history';
import { entryDay } from '../../domain/historyStats';
import { avatarUrl, dayHeading, KindIcon, timeOf } from './historyUi';

interface HistoryListProps {
  entries: HistoryEntry[];
  today: string;
  laneName: (id: string) => string | undefined;
}

/** The author's GitHub picture, or the initial when the picture cannot be loaded. */
function Author({ entry }: { entry: HistoryEntry }) {
  const [failed, setFailed] = useState(false);
  const picture = failed ? null : avatarUrl(entry.actor.githubId);
  return (
    <span className="inline-flex items-center gap-1.5 align-bottom font-semibold">
      {picture ? (
        <img
          src={picture}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-5 w-5 rounded-full bg-surface-strong"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-strong text-xs uppercase"
        >
          {entry.actor.login.charAt(0)}
        </span>
      )}
      {entry.actor.login || 'Qualcuno'}
    </span>
  );
}

function HistoryRow({
  entry,
  laneName,
}: {
  entry: HistoryEntry;
  laneName: HistoryListProps['laneName'];
}) {
  const changes = fieldChanges(entry, laneName);
  const kind = historyKind(entry);
  return (
    <li className="flex gap-3 py-2.5">
      <time
        dateTime={entry.at?.toISOString()}
        className="w-12 shrink-0 pt-0.5 text-xs text-fg-muted tabular-nums"
      >
        {entry.at ? timeOf(entry.at) : 'adesso'}
      </time>
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-strong text-fg-muted">
        <KindIcon kind={kind} className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="wrap-break-word">
          <Author entry={entry} /> {describeChange(entry)}
          {!entry.at && <span className="ml-1 text-xs text-fg-muted">(in attesa di conferma)</span>}
        </p>
        {changes.length > 0 && (
          <details className="group mt-1">
            <summary className="cursor-pointer text-xs font-semibold text-link">Dettagli</summary>
            <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg bg-surface-muted p-2 text-xs">
              {changes.map((change) => (
                <div key={change.label} className="contents">
                  <dt className="text-fg-muted">{change.label}</dt>
                  <dd className="wrap-break-word">
                    {change.before !== undefined && (
                      <>
                        <del className="text-fg-muted">{change.before}</del>
                        {change.after !== undefined && ' → '}
                      </>
                    )}
                    {change.after !== undefined && (
                      <ins className="no-underline">{change.after}</ins>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>
    </li>
  );
}

/** The changes, most recent first, under the day they were made. */
export function HistoryList({ entries, today, laneName }: HistoryListProps) {
  const days: { day: string; entries: HistoryEntry[] }[] = [];
  for (const entry of entries) {
    const day = entryDay(entry, today);
    const last = days.at(-1);
    if (last?.day === day) last.entries.push(entry);
    else days.push({ day, entries: [entry] });
  }

  return (
    <div className="space-y-4">
      {days.map(({ day, entries: dayEntries }) => (
        <section key={day} aria-labelledby={`history-day-${day}`}>
          <h3
            id={`history-day-${day}`}
            className="flex items-baseline justify-between gap-2 border-b border-line pb-1 text-xs font-bold tracking-wide text-fg-muted uppercase"
          >
            {dayHeading(day, today)}
            <span className="font-normal normal-case">
              {dayEntries.length} {dayEntries.length === 1 ? 'modifica' : 'modifiche'}
            </span>
          </h3>
          <ol className="divide-y divide-line">
            {dayEntries.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} laneName={laneName} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
