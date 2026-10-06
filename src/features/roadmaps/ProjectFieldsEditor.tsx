import { useId } from 'react';
import { CURRENCIES } from '../../domain/roadmapConfig';
import type { ProjectField } from '../../domain/types';
import { DATE_MAX, FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { emptyDraft } from './fieldDrafts';
import type { FieldDraft, FieldDrafts } from './fieldDrafts';

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
    if (field.multiple) {
      return (
        <div
          role="group"
          aria-labelledby={`${controlId}-label`}
          aria-describedby={describedBy}
          className="flex flex-wrap gap-x-4 gap-y-1.5"
        >
          {options.map((option) => (
            <label
              key={option.id}
              className="inline-flex cursor-pointer items-center gap-1.5 text-sm"
            >
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
              {option.label}
            </label>
          ))}
        </div>
      );
    }
    return (
      <select
        id={controlId}
        value={draft.ids[0] ?? ''}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) =>
          onChange({ kind: 'choice', ids: event.target.value ? [event.target.value] : [] })
        }
        className={FIELD_CLASS}
      >
        <option value="">Nessuno</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
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
  return (
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
        const labelsGroup = draft.kind === 'choice' && field.multiple;
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
