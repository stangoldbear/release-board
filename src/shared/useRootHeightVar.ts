import { useLayoutEffect } from 'react';

/**
 * Keeps a CSS variable on the page equal to the height of an element fixed at an edge of the
 * window, such as the header or the bar of the tabs, so that the page can keep its content and a
 * focused element clear of it (the scroll padding in index.css).
 */
export function useRootHeightVar(ref: { current: HTMLElement | null }, variable: string): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() =>
      root.style.setProperty(variable, `${element.offsetHeight}px`),
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty(variable);
    };
  }, [ref, variable]);
}
