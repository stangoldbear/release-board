/** A row of buttons of which one is chosen, as the views of the calendar. */
export const SEGMENTED = 'flex items-center rounded-xl border border-line bg-surface-strong p-1';

/**
 * One button of the row; add SEGMENT_ON or SEGMENT_OFF, with aria-pressed. The chosen one also
 * shows a check, so that the choice does not rest on the background alone.
 */
export const SEGMENT =
  'inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors';
export const SEGMENT_ON = 'bg-surface text-fg shadow-xs';
export const SEGMENT_OFF = 'text-fg-muted hover:text-fg';
