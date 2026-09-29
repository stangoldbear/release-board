import { useEffect, useState } from 'react';
import type { HistoryReader } from '../../app/HistoryReader';
import { describeHistoryEntry } from '../../domain/history';
import type { HistoryEntry } from '../../domain/history';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { formatDateTimeIT } from '../../utils/dateUtils';

const LIMIT = 100;

interface HistoryDialogProps {
  history: HistoryReader;
  onClose: () => void;
}

/** The latest changes to the plan, live: who did what and when. */
export function HistoryDialog({ history, onClose }: HistoryDialogProps) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  useEffect(() => history.subscribeHistory(LIMIT, setEntries), [history]);

  return (
    <Dialog
      title="Cronologia"
      description={`Le ultime ${LIMIT} modifiche, in tempo reale`}
      onClose={onClose}
      className="max-w-lg"
      footer={<Button onClick={onClose}>Chiudi</Button>}
    >
      {entries === null ? (
        <p className="text-sm text-fg-muted">Caricamento…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-fg-muted">Nessuna modifica registrata.</p>
      ) : (
        <ol className="divide-y divide-line text-sm">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 py-2"
            >
              <span className="min-w-0 flex-1">{describeHistoryEntry(entry)}</span>
              <time
                dateTime={entry.at?.toISOString()}
                className="shrink-0 text-xs text-fg-muted tabular-nums"
              >
                {entry.at ? formatDateTimeIT(entry.at.toISOString()) : 'in attesa di conferma'}
              </time>
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}
