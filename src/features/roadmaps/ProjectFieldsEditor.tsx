import { useId } from 'react';
import { ExternalLink } from 'lucide-react';
import { CURRENCIES, isHttpUrl } from '../../domain/roadmapConfig';
import type { ProjectField } from '../../domain/types';
import { DATE_MAX, FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { emptyDraft } from './fieldDrafts';
import type { FieldDraft, FieldDrafts } from './fieldDrafts';
import { FieldTag, linkLabel } from './fieldUi';

interface ProjectFieldsEditorProps {
  /** The fields, in their order. */
  fields: readonly ProjectField[];
  drafts: FieldDrafts;
  /** What does not fit, by field, after a failed save. */
  problems: Record<string, string>;
  onChange: (fieldId: string, draft: FieldDraft) => void;
}

/** One control per custom field: the choices as checkboxes or a list, a price with its currency, the rest as text. */
function FieldControl({
  field,
  draft,
  problem,
  controlId,
  describedBy,
  onChange,
}: {
  field: ProjectField;
  draft: FieldDraft;
  problem: string | undefined;
  controlId: string;
  describedBy: string | undefined;
  onChange: (draft: FieldDraft) => void;
}) {
  const invalid = problem !== undefined;
  if (draft.kind === 'choice') {
    const options = field.options ?? [];
    // The values as the roadmap shows them, tags in their colors: checkboxes when they add up,
    // radio buttons with "Nessuno" when one excludes the others.
    return (
      <div
        role={field.multiple ? 'group' : 'radiogroup'}
        aria-labelledby={`${controlId}-label`}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className="flex flex-wrap gap-x-4 gap-y-1.5"
      >
        {!field.multiple && (
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="radio"
              name={controlId}
              checked={draft.ids.length === 0}
              onChange={() => onChange({ kind: 'choice', ids: [] })}
            />
            Nessuno
          </label>
        )}
        {options.map((option) => (
          <label
            key={option.id}
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm"
          >
            {field.multiple ? (
              <input
                type="checkbox"
                checked={draft.ids.includes(option.id)}
                onChange={(event) =>
                  onChange({
                    kind: 'choice',
                    ids: event.target.checked
                      ? [...draft.ids, option.id]
                      : draft.ids.filter((id) => id !== option.id),
                  })
                }
              />
            ) : (
              <input
                type="radio"
                name={controlId}
                checked={draft.ids[0] === option.id}
                onChange={() => onChange({ kind: 'choice', ids: [option.id] })}
              />
            )}
            <FieldTag colorId={option.colorId}>{option.label}</FieldTag>
          </label>
        ))}
      </div>
    );
  }
  if (draft.kind === 'price') {
    const currencies = CURRENCIES.includes(draft.currency)
      ? CURRENCIES
      : [draft.currency, ...CURRENCIES];
    return (
      <div className="flex gap-2">
        <input
          id={controlId}
          type="text"
          inputMode="decimal"
          value={draft.amount}
          placeholder="es. 12.000"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange({ ...draft, amount: event.target.value })}
          className={`${FIELD_CLASS} flex-1`}
        />
        <select
          aria-label={`Valuta di ${field.label}`}
          value={draft.currency}
          onChange={(event) => onChange({ ...draft, currency: event.target.value })}
          className={`${FIELD_CLASS} w-24`}
        >
          {currencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </div>
    );
  }
  const multiline = field.type === 'textarea' || field.multiple;
  if (multiline) {
    const placeholder = field.multiple
      ? field.type === 'url'
        ? 'Un link per riga, con https://'
        : field.type === 'price'
          ? 'Un importo per riga, con la valuta: 12.000 EUR'
          : field.type === 'date'
            ? 'Una data per riga, come 2026-10-05'
            : 'Un valore per riga'
      : undefined;
    return (
      <>
        <textarea
          id={controlId}
          rows={field.type === 'textarea' ? 4 : 3}
          value={draft.text}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange({ kind: 'text', text: event.target.value })}
          className={`${FIELD_CLASS} ${field.type === 'url' ? 'font-mono text-xs' : ''}`}
        />
        {field.type === 'url' && <OpenLinks text={draft.text} />}
      </>
    );
  }
  if (field.type === 'date') {
    return (
      <input
        id={controlId}
        type="date"
        max={DATE_MAX}
        value={draft.text}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange({ kind: 'text', text: event.target.value })}
        className={FIELD_CLASS}
      />
    );
  }
  const input = (
    <input
      id={controlId}
      type="text"
      inputMode={field.type === 'number' ? 'decimal' : field.type === 'url' ? 'url' : 'text'}
      value={draft.text}
      placeholder={field.type === 'url' ? 'https://…' : undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(event) => onChange({ kind: 'text', text: event.target.value })}
      className={`${FIELD_CLASS} ${field.type === 'url' ? 'font-mono text-xs' : ''}`}
    />
  );
  if (field.type !== 'url') return input;
  // A link can be followed from here, without copying it.
  return (
    <div className="flex items-center gap-1">
      {input}
      <OpenLink url={draft.text.trim()} />
    </div>
  );
}

/** Opens a link in a new tab, as a small button beside its field; nothing while the text is not a link. */
function OpenLink({ url }: { url: string }) {
  if (!isHttpUrl(url)) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Apri ${linkLabel(url)} in una nuova scheda`}
      title="Apri il link in una nuova scheda"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-link hover:bg-surface-strong"
    >
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

/** The links of a field with several, one per line, each to follow from here. */
function OpenLinks({ text }: { text: string }) {
  const urls = text
    .split('\n')
    .map((line) => line.trim())
    .filter(isHttpUrl);
  if (urls.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5 text-xs">
      {urls.map((url) => (
        <li key={url}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            title={url}
            className="inline-flex items-center gap-1 rounded-md border border-line-strong px-1.5 py-0.5 text-link hover:bg-surface-strong"
          >
            <span className="max-w-48 truncate">{linkLabel(url)}</span>
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="sr-only"> (si apre in una nuova scheda)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * The custom fields of a project, as Settings → Roadmap defines them: a label, what the field is
 * for, and the control that fits its type. A problem found at saving shows under its field.
 */
export function ProjectFieldsEditor({
  fields,
  drafts,
  problems,
  onChange,
}: ProjectFieldsEditorProps) {
  const prefix = useId();
  if (fields.length === 0) return null;
  return (
    <fieldset className="space-y-4 border-t border-line pt-4">
      <legend className={LABEL_CLASS}>Campi personalizzati</legend>
      {fields.map((field) => {
        const controlId = `${prefix}-${field.id}`;
        const descriptionId = field.description ? `${controlId}-description` : undefined;
        const problem = problems[field.id];
        const problemId = problem ? `${controlId}-problem` : undefined;
        const describedBy = [descriptionId, problemId].filter(Boolean).join(' ') || undefined;
        const draft = drafts[field.id] ?? emptyDraft(field);
        const labelsGroup = draft.kind === 'choice';
        return (
          <div key={field.id}>
            {labelsGroup ? (
              <span id={`${controlId}-label`} className={LABEL_CLASS}>
                {field.label}
                {field.required && ' *'}
              </span>
            ) : (
              <label htmlFor={controlId} className={LABEL_CLASS}>
                {field.label}
                {field.required && ' *'}
              </label>
            )}
            {field.description && (
              <p id={descriptionId} className="mb-1.5 -mt-1 text-xs text-fg-muted">
                {field.description}
              </p>
            )}
            <FieldControl
              field={field}
              draft={draft}
              problem={problem}
              controlId={controlId}
              describedBy={describedBy}
              onChange={(next) => onChange(field.id, next)}
            />
            {problem && (
              <p id={problemId} role="alert" className="mt-1 text-xs font-medium text-danger">
                {problem}
              </p>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
