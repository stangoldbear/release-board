import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * A function that keeps the same identity across renders and calls the latest `callback`. Memoized
 * children receive it without re-rendering each time the parent passes a new arrow function. Call
 * it from event handlers, not during render.
 */
export function useStableCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const latest = useRef(callback);
  useLayoutEffect(() => {
    latest.current = callback;
  });
  return useCallback((...args: Args) => latest.current(...args), []);
}
