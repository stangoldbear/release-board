import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { SEARCH_MODES, stepResult } from '../domain/filters';
import type { SearchMode, SearchResult } from '../domain/filters';
import { Button } from '../shared/ui/Button';

const MODE_LABELS: Record<SearchMode, { label: string; title: string }> = {
  all: { label: 'Tutte le parole', title: 'Trova ciò che ha tutte le parole cercate' },
  any: { label: 'Almeno una', title: 'Trova ciò che ha almeno una delle parole cercate' },
};

/** What the search found, in words: "Trovati: 2 attività su 11 · …", or that it found nothing. */
export function describeFound(counts: readonly FoundCount[], total: number): string {
  if (total === 0) return 'Nessun risultato';
  return `Trovati: ${counts
    .map(
      (count) => `${count.found} ${count.found === 1 ? count.one : count.many} su ${count.total}`,
    )
    .join(' · ')}`;
}

/** How many items of a kind the search found, out of how many. */
export interface FoundCount {
  found: number;
  total: number;
  one: string;
  many: string;
}

interface SearchResultsBarProps {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  /** What was found, kind by kind, in the order of the page. */
  counts: FoundCount[];
  results: SearchResult[];
  /** The index of the result in view; null before the first one is shown. */
  current: number | null;
  onShow: (index: number) => void;
  onClear: () => void;
}

/**
 * Under the header while something is searched: whether every word must be found or one is
 * enough, what was found in each area, and the buttons that bring the results into view one by
 * one, the same as Enter and Shift+Enter in the search field.
 */
export function SearchResultsBar({
  mode,
  onModeChange,
  counts,
  results,
  current,
  onShow,
  onClear,
}: SearchResultsBarProps) {
  const total = results.length;
  const shown = current === null ? null : results[current];
  const step = (by: 1 | -1) => onShow(stepResult(current, total, by));

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line bg-surface-muted px-4 py-2 text-xs sm:px-6">
      <div
        role="group"
        aria-label="Parole da trovare"
        className="flex items-center rounded-lg border border-line bg-surface-strong p-0.5"
      >
        {SEARCH_MODES.map((option) => {
          const pressed = mode === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={pressed}
              title={MODE_LABELS[option].title}
              onClick={() => onModeChange(option)}
              className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-semibold transition-colors ${
                pressed ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {pressed && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
              {MODE_LABELS[option].label}
            </button>
          );
        })}
      </div>

      {/* The header announces the same words, from a region that is always there. */}
      <p className="text-fg-muted">
        {total === 0 ? (
          <strong className="text-fg">Nessun risultato</strong>
        ) : (
          <>
            Trovati:{' '}
            {counts.map((count, index) => (
              <span key={count.many}>
                {index > 0 && ' · '}
                <strong className="text-fg">{count.found}</strong>{' '}
                {count.found === 1 ? count.one : count.many} su {count.total}
              </span>
            ))}
          </>
        )}
      </p>

      {total > 0 && (
        <nav aria-label="Risultati della ricerca" className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="p-1"
            onClick={() => step(-1)}
            aria-label="Risultato precedente"
            title="Risultato precedente (Maiusc + Invio)"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="min-w-16 text-center font-semibold tabular-nums">
            {current === null
              ? `${total} ${total === 1 ? 'risultato' : 'risultati'}`
              : `${current + 1} di ${total}`}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="p-1"
            onClick={() => step(1)}
            aria-label="Risultato successivo"
            title="Risultato successivo (Invio)"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span role="status" className="sr-only">
            {shown && current !== null ? `${current + 1} di ${total}: ${shown.label}` : ''}
          </span>
        </nav>
      )}

      {/*
        On phones the header scrolls away: once a result is in view, its arrows also float at the
        bottom of the screen.
      */}
      {total > 0 && current !== null && (
        <nav
          aria-label="Risultati della ricerca, in basso"
          className="fixed right-4 bottom-4 z-40 flex items-center gap-1 rounded-full border border-line bg-surface p-1 text-xs shadow-2xl sm:hidden"
        >
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full p-2"
            onClick={() => step(-1)}
            aria-label="Risultato precedente"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="font-semibold tabular-nums">
            {current + 1} di {total}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full p-2"
            onClick={() => step(1)}
            aria-label="Risultato successivo"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>
      )}

      <Button size="sm" className="ml-auto" onClick={onClear}>
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Azzera la ricerca
      </Button>
    </div>
  );
}
