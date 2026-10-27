import { useEffect, useMemo, useState } from 'react';
import { Redo2, Undo2 } from 'lucide-react';
import type { ChangeUndo } from '../../app/ChangeUndo';
import type { HistoryReader } from '../../app/HistoryReader';
import { describeChange } from '../../domain/history';
import type { HistoryEntry } from '../../domain/history';
import { entryDay } from '../../domain/historyStats';
import { UNDO_WINDOW, undoStacks } from '../../domain/undo';
import type { UndoStacks } from '../../domain/undo';
import { useDateFormat } from '../../shared/dateFormat';
import { Button } from '../../shared/ui/Button';
import { useStableCallback } from '../../shared/useStableCallback';
import { dayHeading, timeOf } from './historyUi';

/** How long the commands wait for the history to show an undo or a redo just written. */
const PENDING_MS = 5000;

/** The stacks of the signed-in member, from the recent history; null while it loads. */
function useUndoStacks(history: HistoryReader, githubId: string): UndoStacks | null {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  useEffect(() => history.subscribeHistory({ limit: UNDO_WINDOW }, setEntries), [history]);
  return useMemo(() => entries && undoStacks(entries, githubId), [entries, githubId]);
}

/** The keys as the keyboard of this device names them: ⌘Z and ⇧⌘Z on a Mac. */
const KEYS =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
    ? { undo: '⌘Z', redo: '⇧⌘Z' }
    : { undo: 'Ctrl+Z', redo: 'Ctrl+Maiusc+Z' };

function Keys({ children }: { children: string }) {
  return (
    <kbd className="rounded-sm border border-line-strong bg-surface-muted px-1 font-sans text-xs font-semibold">
      {children}
    </kbd>
  );
}

/** Where focus types text: there the keys undo the typing, not a change of the plan. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches('input, textarea, [role="textbox"]'))
  );
}

/**
 * Undo and redo of the member's own changes, one at a time, from the latest back: what the next
 * undo and redo would do, the two commands with their keys, and what happened, or why not.
 */
export function UndoPanel({
  history,
  changes,
  githubId,
  today,
}: {
  history: HistoryReader;
  changes: ChangeUndo;
  githubId: string;
  today: string;
}) {
  const format = useDateFormat();
  const stacks = useUndoStacks(history, githubId);
  const next = stacks?.undo.at(-1) ?? null;
  const again = stacks?.redo.at(-1) ?? null;
  // The entry just undone or redone: the commands wait until the history has moved it.
  const [pending, setPending] = useState<{ id: string; direction: 'undo' | 'redo' } | null>(null);
  const [message, setMessage] = useState<{ text: string; refused: boolean } | null>(null);
  const waiting =
    pending !== null && (pending.direction === 'undo' ? next : again)?.id === pending.id;
  // A write refused by the server never reaches the history: the commands come back anyway, and
  // «Sincronizzato» says what went wrong.
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setPending(null), PENDING_MS);
    return () => clearTimeout(timer);
  }, [pending]);
  const busy = stacks === null || waiting;

  const describe = (entry: HistoryEntry) => describeChange(entry, format);
  const when = (entry: HistoryEntry) =>
    entry.at ? `${dayHeading(entryDay(entry, today), today)}, ${timeOf(entry.at)}` : 'Adesso';

  const act = useStableCallback((direction: 'undo' | 'redo') => {
    const entry = direction === 'undo' ? next : again;
    if (!entry || busy) return;
    const outcome = direction === 'undo' ? changes.undoChange(entry) : changes.redoChange(entry);
    if (outcome.done) {
      setPending({ id: entry.id, direction });
      setMessage({
        text: `${direction === 'undo' ? 'Annullato' : 'Ripetuto'}: ${describe(entry)}.`,
        refused: false,
      });
    } else {
      setMessage({ text: outcome.reason, refused: true });
    }
  });

  // The keys of every editor: on this page they undo and redo the changes of the plan.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || isTyping(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        event.preventDefault();
        act(key === 'y' || event.shiftKey ? 'redo' : 'undo');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act]);

  return (
    <section
      aria-labelledby="undo-title"
      className="rounded-xl border border-line bg-surface p-4 shadow-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="undo-title" className="text-sm font-bold">
            Le tue modifiche
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            Una alla volta, dalla più recente, anche dopo aver ricaricato la pagina: valgono le
            modifiche fatte dalla versione 0.22.
            {/* Only where there is a keyboard: a phone has none to press them. */}
            <span className="pointer-coarse:hidden">
              {' '}
              Da tastiera <Keys>{KEYS.undo}</Keys> e <Keys>{KEYS.redo}</Keys>.
            </span>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            onClick={() => act('undo')}
            disabled={!next || busy}
            aria-keyshortcuts="Control+Z Meta+Z"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            Annulla
          </Button>
          <Button
            onClick={() => act('redo')}
            disabled={!again || busy}
            aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
          >
            <Redo2 className="h-4 w-4" aria-hidden="true" />
            Ripeti
          </Button>
        </div>
      </div>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs text-fg-muted">Da annullare</dt>
          <dd className="mt-0.5 break-words">
            {stacks === null
              ? 'Caricamento…'
              : next
                ? `${describe(next)} · ${when(next)}`
                : 'Nessuna modifica da annullare'}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-fg-muted">Da ripetere</dt>
          <dd className="mt-0.5 break-words">
            {stacks === null
              ? 'Caricamento…'
              : again
                ? `${describe(again)} · ${when(again)}`
                : 'Nessuna modifica da ripetere'}
          </dd>
        </div>
      </dl>
      <p
        role="status"
        className={`mt-2 text-xs ${message?.refused ? 'font-semibold text-danger' : 'text-fg-muted'}`}
      >
        {message?.text}
      </p>
    </section>
  );
}
