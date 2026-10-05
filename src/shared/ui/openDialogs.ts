import { useSyncExternalStore } from 'react';

// The windows the user opened, counted so that a window the app opens on its own, such as the
// reminders, waits for them to close instead of covering them.

let open = 0;
const listeners = new Set<() => void>();

function change(step: number): void {
  open += step;
  for (const listener of listeners) listener();
}

/** Counts a window the user opened until the returned function is called. */
export function trackOpenDialog(): () => void {
  change(1);
  return () => change(-1);
}

/** How many windows the user opened are open now. */
export function useOpenDialogCount(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => open,
  );
}
