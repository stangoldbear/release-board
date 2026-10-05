import { useEffect, useRef, useState } from 'react';

/** The screens of the app that have an address of their own. */
export type Page = 'calendar' | 'history';

const HISTORY_HASH = '#cronologia';

function currentPage(): Page {
  return window.location.hash === HISTORY_HASH ? 'history' : 'calendar';
}

/**
 * The screen shown, kept in the address: the history has its own (#cronologia), so it can be
 * bookmarked and the browser's back button returns to the calendar.
 */
export function useHashPage(): [Page, (page: Page) => void] {
  const [page, setPage] = useState(currentPage);
  // Whether the history was opened from the calendar: going back then pops it from the browser's
  // history instead of adding a new step.
  const openedHere = useRef(false);

  useEffect(() => {
    const onHashChange = () => setPage(currentPage());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const go = (next: Page) => {
    if (next === 'history') {
      openedHere.current = true;
      window.location.hash = HISTORY_HASH;
    } else if (openedHere.current) {
      openedHere.current = false;
      window.history.back();
    } else {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
      setPage('calendar');
    }
  };
  return [page, go];
}
