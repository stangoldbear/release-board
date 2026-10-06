import {
  DEFAULT_CURRENCY,
  fieldValuesOf,
  formatFieldValue,
  parseFieldInput,
} from '../../domain/roadmapConfig';
import type { FieldValue, ProjectField, ProjectFieldValues } from '../../domain/types';

// What the editor of a project holds for its custom fields while they are typed, and how it turns
// that into values to save. Everything is text, one value per line for the fields with several,
// but the choices, which are the ids of the chosen options, and a single price, with its currency
// apart.

export type FieldDraft =
  | { kind: 'text'; text: string }
  | { kind: 'choice'; ids: string[] }
  | { kind: 'price'; amount: string; currency: string };

export type FieldDrafts = Record<string, FieldDraft>;

/** A value as the editor shows it: dates and links as they are, numbers the Italian way. */
function draftText(field: ProjectField, value: FieldValue): string {
  return typeof value === 'string' ? value : formatFieldValue(field, value);
}

/** The drafts of the fields from the values a project has. */
export function draftsFrom(
  fields: readonly ProjectField[],
  values: ProjectFieldValues,
): FieldDrafts {
  const drafts: FieldDrafts = {};
  for (const field of fields) {
    const current = fieldValuesOf({ fields: values }, field);
    if (field.type === 'choice') {
      drafts[field.id] = {
        kind: 'choice',
        ids: current.filter((v): v is string => typeof v === 'string'),
      };
    } else if (field.type === 'price' && !field.multiple) {
      const price = current[0];
      drafts[field.id] =
        typeof price === 'object'
          ? {
              kind: 'price',
              amount: formatFieldValue(field, price.amount),
              currency: price.currency,
            }
          : { kind: 'price', amount: '', currency: DEFAULT_CURRENCY };
    } else {
      drafts[field.id] = {
        kind: 'text',
        text: current.map((value) => draftText(field, value)).join('\n'),
      };
    }
  }
  return drafts;
}

/** The draft of a field when it has none yet. */
export function emptyDraft(field: ProjectField): FieldDraft {
  if (field.type === 'choice') return { kind: 'choice', ids: [] };
  if (field.type === 'price' && !field.multiple) {
    return { kind: 'price', amount: '', currency: DEFAULT_CURRENCY };
  }
  return { kind: 'text', text: '' };
}

const PROBLEMS: Record<ProjectField['type'], string> = {
  text: 'Testo non valido.',
  textarea: 'Testo non valido.',
  number: 'Numero non valido: scrivi solo cifre, con la virgola per i decimali.',
  price: 'Prezzo non valido: un importo e la valuta in tre lettere, come 12.000 EUR.',
  url: 'Link non valido: deve iniziare con https:// o http://.',
  date: 'Data non valida: scrivila come AAAA-MM-GG.',
  choice: 'Scelta non valida.',
};

export const REQUIRED_PROBLEM = 'Serve almeno un valore.';

/** A line of a price with several values: "12.000 EUR", or "12.000" in the default currency. */
function parsePriceLine(field: ProjectField, line: string): FieldValue | null {
  const match = /^(.*?)\s*([A-Za-z]{3})?$/.exec(line.trim());
  const amount = match?.[1] ?? line;
  const currency = (match?.[2] ?? DEFAULT_CURRENCY).toUpperCase();
  return parseFieldInput(field, amount, currency);
}

/**
 * The values to save from the drafts, and the problem of each field whose draft is not a value,
 * in words for the person. Blank drafts give no value; a required field without values has a
 * problem too.
 */
export function valuesFrom(
  fields: readonly ProjectField[],
  drafts: FieldDrafts,
): { values: ProjectFieldValues; problems: Record<string, string> } {
  const values: ProjectFieldValues = {};
  const problems: Record<string, string> = {};
  for (const field of fields) {
    const draft = drafts[field.id] ?? emptyDraft(field);
    let parsed: FieldValue[] = [];
    if (draft.kind === 'choice') {
      parsed = draft.ids.filter((id) => (field.options ?? []).some((option) => option.id === id));
      if (!field.multiple) parsed = parsed.slice(0, 1);
    } else if (draft.kind === 'price') {
      if (draft.amount.trim() !== '') {
        const price = parseFieldInput(field, draft.amount, draft.currency.toUpperCase());
        if (price === null) problems[field.id] = PROBLEMS.price;
        else parsed = [price];
      }
    } else {
      const lines =
        field.multiple && field.type !== 'textarea'
          ? draft.text
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
          : draft.text.trim()
            ? [draft.text.trim()]
            : [];
      for (const line of lines) {
        const value =
          field.type === 'price' ? parsePriceLine(field, line) : parseFieldInput(field, line);
        if (value === null) {
          problems[field.id] = PROBLEMS[field.type];
          break;
        }
        parsed.push(value);
      }
    }
    if (field.required && parsed.length === 0 && !problems[field.id]) {
      problems[field.id] = REQUIRED_PROBLEM;
    }
    if (parsed.length > 0) values[field.id] = parsed;
  }
  return { values, problems };
}
