import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { placePopup } from './popup';
import type { PopupOptions } from './popup';

/**
 * A panel that opens from a control, placed next to it on the screen: a menu, a popover. It
 * closes with a click elsewhere, when the page scrolls or the window changes size, and when its
 * owner asks (Esc, a choice), which gives the focus back to the control.
 */
export function usePopup(options: PopupOptions = {}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { align, side, gap, margin } = options;

  // On every render while open: the content may change the size of the panel.
  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!open || !trigger || !panel) return;
    const place = placePopup(
      trigger.getBoundingClientRect(),
      panel.getBoundingClientRect(),
      { width: window.innerWidth, height: window.innerHeight },
      { align, side, gap, margin },
    );
    panel.style.top = `${place.top}px`;
    panel.style.left = `${place.left}px`;
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const close = () => setOpen(false);
    window.addEventListener('pointerdown', onPointerDown);
    // Placed on the screen, the panel would drift away from a control that scrolls.
    window.addEventListener('scroll', close, { capture: true, passive: true });
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('resize', close);
    };
  }, [open]);

  /** Closes and gives the focus back to the control, as after Esc or a choice. */
  const dismiss = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return { open, setOpen, dismiss, triggerRef, panelRef };
}
