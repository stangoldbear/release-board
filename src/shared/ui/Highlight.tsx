import { createContext, useContext } from 'react';
import { highlightRanges } from '../../domain/filters';
import type { SearchResultKind } from '../../domain/filters';

/** What the search highlights on the page. */
export interface SearchHighlight {
  /** The words searched, lowercase and without accents; none when nothing is searched. */
  words: readonly string[];
  /** The result brought into view, from `resultKey`; null when none is. */
  current: string | null;
}

export const SearchHighlightContext = createContext<SearchHighlight>({ words: [], current: null });

/** The key of a result, as `current` names it. */
export function resultKey(kind: SearchResultKind, id: string): string {
  return `${kind}:${id}`;
}

/**
 * The outline around the result brought into view: dashed and thicker, so that it is told apart
 * from the solid focus indicator even where both have the same color.
 */
export const CURRENT_RESULT = 'outline-3 outline-offset-2 outline-dashed outline-link';

/** Whether this item is the result brought into view. */
export function useIsCurrentResult(kind: SearchResultKind, id: string): boolean {
  return useContext(SearchHighlightContext).current === resultKey(kind, id);
}

/**
 * A text with the searched words marked, in the colors of the accent, whose contrast every theme
 * checks. Without a search, the text as it is.
 */
export function Highlight({ text }: { text: string }) {
  const { words } = useContext(SearchHighlightContext);
  const ranges = highlightRanges(text, words);
  if (ranges.length === 0) return text;
  const parts = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push(text.slice(at, start));
    parts.push(
      <mark key={start} className="rounded-[2px] bg-accent text-on-accent">
        {text.slice(start, end)}
      </mark>,
    );
    at = end;
  }
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}
