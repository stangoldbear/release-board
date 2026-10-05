/** Look of text fields, text areas and selects; aria-invalid="true" marks an error. */
export const FIELD_CLASS =
  'w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted aria-invalid:border-2 aria-invalid:border-danger';

/**
 * The last day a date field accepts. Browsers take years of five and six digits, which the plan
 * cannot hold: the saved plan would no longer open.
 */
export const DATE_MAX = '9999-12-31';

/** Look of the label above a field. */
export const LABEL_CLASS =
  'mb-1.5 block text-xs font-semibold tracking-wide text-fg-muted uppercase';
