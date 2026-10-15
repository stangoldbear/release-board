import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { LABELS_MAX, LABEL_NAME_MAX, labelNameError, labelNamed } from '../../domain/labels';
import { normalizeText } from '../../domain/filters';
import type { FieldOption } from '../../domain/types';
import { FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { FieldTag } from './fieldUi';

/** One line of the list under the field: a label to add, or a new one to create with the words typed. */
type Choice = { kind: 'label'; label: FieldOption } | { kind: 'create'; name: string };

/**
 * The labels of a project in its window: the chosen ones as tags, each with its button to take it
 * away, then a field that searches the others. The arrows go through the list, Enter adds, a word
 * no label has creates one for every member when `onCreate` is given; Backspace in the empty field
 * takes away the last tag, Esc closes the list and leaves the window open.
 */
export function LabelsPicker({
  labels,
  selected,
  onChange,
  onCreate,
}: {
  labels: readonly FieldOption[];
  selected: readonly string[];
  onChange: (ids: string[]) => void;
  /** Adds a label to the plan and returns its id; absent when labels cannot be created here. */
  onCreate?: (name: string) => string | null;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputId = useId();
  const listId = useId();
  const helpId = useId();
  const chosen = selected
    .map((id) => labels.find((label) => label.id === id))
    .filter((label): label is FieldOption => label !== undefined);
  const words = normalizeText(query.trim());
  const choices: Choice[] = labels
    .filter((label) => !selected.includes(label.id) && normalizeText(label.label).includes(words))
    .map((label) => ({ kind: 'label', label }));
  const exact = labelNamed(labels, query);
  if (
    onCreate &&
    query.trim() !== '' &&
    !exact &&
    labels.length < LABELS_MAX &&
    labelNameError(query, labels) === null
  ) {
    choices.push({ kind: 'create', name: query.trim() });
  }
  const shown = open && choices.length > 0;
  const current = Math.min(active, choices.length - 1);
  const optionId = (index: number) => `${listId}-${index}`;

  const add = (id: string) => {
    if (!selected.includes(id)) onChange([...selected, id]);
    setQuery('');
    setActive(0);
  };
  const pick = (choice: Choice) => {
    if (choice.kind === 'label') {
      add(choice.label.id);
      return;
    }
    const id = onCreate?.(choice.name);
    if (id) add(id);
  };
  const remove = (id: string) => onChange(selected.filter((item) => item !== id));

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!shown) {
          setOpen(true);
          return;
        }
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActive((current + step + choices.length) % choices.length);
        return;
      }
      case 'Enter': {
        // Enter adds; it never saves the window from here.
        event.preventDefault();
        const choice = shown ? choices[current] : undefined;
        if (choice) pick(choice);
        else if (exact && !selected.includes(exact.id)) add(exact.id);
        return;
      }
      case 'Escape':
        if (shown) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
        return;
      case 'Backspace': {
        const last = chosen.at(-1);
        if (query === '' && last) remove(last.id);
        return;
      }
      default:
    }
  };

  return (
    <div>
      <label htmlFor={inputId} className={LABEL_CLASS}>
        Etichette
      </label>
      <div className={`${FIELD_CLASS} flex flex-wrap items-center gap-1.5`}>
        {chosen.map((label) => (
          <span key={label.id} className="inline-flex min-w-0 items-center gap-0.5">
            <FieldTag colorId={label.colorId}>{label.label}</FieldTag>
            <button
              type="button"
              aria-label={`Togli l’etichetta ${label.label}`}
              title="Togli l’etichetta"
              onClick={() => remove(label.id)}
              className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md text-fg-muted hover:bg-surface-strong hover:text-fg"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={shown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={shown ? optionId(current) : undefined}
          aria-describedby={helpId}
          value={query}
          maxLength={LABEL_NAME_MAX}
          placeholder={chosen.length === 0 ? 'Cerca o scrivi un’etichetta nuova' : 'Aggiungi…'}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          className="min-w-32 flex-1 border-0 bg-transparent p-0 text-sm text-fg outline-none placeholder:text-fg-muted"
        />
      </div>
      <p id={helpId} className="sr-only">
        Le frecce scorrono le etichette, Invio aggiunge quella scelta
        {onCreate ? ' o crea quella scritta' : ''}; Backspace nel campo vuoto toglie l’ultima.
      </p>
      {/* In the flow of the window, not over it: the body of a window scrolls and would cut it. */}
      <ul
        id={listId}
        role="listbox"
        aria-label="Etichette da aggiungere"
        hidden={!shown}
        className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-line-strong bg-surface p-1 shadow-md"
      >
        {choices.map((choice, index) => (
          <li
            key={choice.kind === 'label' ? choice.label.id : 'create'}
            id={optionId(index)}
            role="option"
            aria-selected={index === current}
            // The field keeps the focus: the list is chosen from with the pointer too.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pick(choice)}
            className={`flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm ${
              index === current ? 'bg-accent-soft' : 'hover:bg-surface-strong'
            }`}
          >
            {choice.kind === 'label' ? (
              <FieldTag colorId={choice.label.colorId}>{choice.label.label}</FieldTag>
            ) : (
              <>
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">Crea l’etichetta «{choice.name}» per tutti</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
