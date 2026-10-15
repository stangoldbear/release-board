import { useId, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash } from 'lucide-react';
import type { TaskColorId } from '../../domain/colors';
import { followerAt } from '../../domain/listOrder';
import { LABELS_MAX, LABEL_NAME_MAX, labelNameError } from '../../domain/labels';
import type { FieldOption } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { FIELD_CLASS } from '../../shared/ui/field';
import { RulesNotice } from '../../shared/ui/RulesNotice';
import { useListDrag } from '../../shared/useListDrag';
import { ColorMenu } from './ColorMenu';

/** What the labels of the projects can do, for every member. */
export interface LabelActions {
  /** Adds a label at the end and returns its id; null when the name is not good or the list is full. */
  onCreate: (name: string) => string | null;
  onChange: (labelId: string, changes: { label?: string; colorId?: TaskColorId }) => void;
  /** Puts a label right before another one, or last when `beforeId` is null. */
  onMove: (labelId: string, beforeId: string | null) => void;
  onDelete: (labelId: string) => void;
}

/** The labels travel with their own type, so that nothing else lands among them. */
const LABEL_DRAG_TYPE = 'application/x-release-board-label';
const LIST = 'labels';

function nameFieldId(labelId: string): string {
  return `label-name-${labelId}`;
}

/** The name of a label, saved when the field is left or with Enter; Esc gives the saved one back. */
function LabelNameField({
  label,
  labels,
  onRename,
}: {
  label: FieldOption;
  labels: readonly FieldOption[];
  onRename: (name: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const errorId = useId();
  const error = draft === null ? null : labelNameError(draft, labels, label.id);
  const save = () => {
    if (draft === null || error) return;
    if (draft.trim() !== label.label) onRename(draft.trim());
    setDraft(null);
  };
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <input
        id={nameFieldId(label.id)}
        type="text"
        value={draft ?? label.label}
        maxLength={LABEL_NAME_MAX}
        aria-label={`Nome dell’etichetta ${label.label}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            save();
          } else if (event.key === 'Escape' && draft !== null) {
            // The window stays open: Esc gives back the saved name only.
            event.preventDefault();
            event.stopPropagation();
            setDraft(null);
          }
        }}
        className={`${FIELD_CLASS} py-1.5 font-semibold`}
      />
      {error && (
        <span id={errorId} role="alert" className="text-xs font-semibold text-danger">
          {error}
        </span>
      )}
    </span>
  );
}

/**
 * Impostazioni › Roadmap › Etichette: the labels of the projects, in their order, each with its
 * name, its color and how many projects have it. A new one goes last; the order changes by
 * dragging or with the arrows; a label goes away after a confirmation that says where it is used.
 */
export function LabelsSettings({
  labels,
  usage,
  unavailable,
  actions,
}: {
  labels: readonly FieldOption[];
  /** How many projects have a label, by its id. */
  usage: (labelId: string) => number;
  /** The published rules do not know the configuration of the roadmap yet. */
  unavailable: boolean;
  actions: LabelActions;
}) {
  const [name, setName] = useState('');
  const [tried, setTried] = useState(false);
  const [toDelete, setToDelete] = useState<FieldOption | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const newId = useId();
  const newErrorId = useId();
  const helpId = useId();
  const ids = labels.map((label) => label.id);
  const full = labels.length >= LABELS_MAX;
  const newError = tried ? labelNameError(name, labels) : null;

  const moveTo = (label: FieldOption, index: number, focusId: string) => {
    actions.onMove(label.id, followerAt(labels, label.id, index));
    setAnnouncement(`${label.label} in posizione ${index + 1} di ${labels.length}`);
    window.requestAnimationFrame(() => document.getElementById(focusId)?.focus());
  };
  const drag = useListDrag(LABEL_DRAG_TYPE, (labelId, _list, index) => {
    const label = labels.find((item) => item.id === labelId);
    if (label) moveTo(label, index, nameFieldId(labelId));
  });
  const step = (label: FieldOption, index: number, delta: -1 | 1, focusId: string) => {
    const target = index + delta;
    if (target < 0) setAnnouncement(`${label.label} è già la prima`);
    else if (target >= labels.length) setAnnouncement(`${label.label} è già l'ultima`);
    else moveTo(label, target, focusId);
  };
  const handleKey = (event: KeyboardEvent, label: FieldOption, index: number) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    step(label, index, event.key === 'ArrowUp' ? -1 : 1, nameFieldId(label.id));
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (full || labelNameError(name, labels)) return;
    if (actions.onCreate(name.trim()) === null) return;
    setAnnouncement(`Etichetta ${name.trim()} aggiunta in fondo`);
    setName('');
    setTried(false);
  };

  if (unavailable) return <RulesNotice what="Le etichette dei progetti" />;
  return (
    <div className="space-y-4">
      <p className="text-xs text-fg-muted">
        Etichette per raccogliere i progetti, quante ne servono a ognuno: si danno nella finestra
        del progetto, si leggono nelle sue informazioni e filtrano la timeline dal menu «Etichette».
      </p>
      {labels.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-3 py-3 text-sm text-fg-muted">
          Nessuna etichetta: scrivi la prima qui sotto, o nella finestra di un progetto.
        </p>
      ) : (
        <ul {...drag.container} aria-describedby={helpId} className="space-y-1.5">
          {labels.map((label, index) => {
            const count = usage(label.id);
            const slot = drag.slot(LIST);
            return (
              <li
                key={label.id}
                {...drag.target(LIST, ids, index, 'y')}
                onKeyDown={(event) => handleKey(event, label, index)}
                className={`relative flex flex-wrap items-start gap-2 rounded-lg border border-line bg-surface p-2 ${
                  drag.dragged === label.id ? 'opacity-50' : ''
                }`}
              >
                {slot === index && (
                  <span aria-hidden="true" className="absolute inset-x-0 -top-1 h-0.5 bg-link" />
                )}
                {slot === labels.length && index === labels.length - 1 && (
                  <span aria-hidden="true" className="absolute inset-x-0 -bottom-1 h-0.5 bg-link" />
                )}
                <span
                  draggable
                  {...drag.source(label.id, LIST)}
                  title="Trascina per cambiare l’ordine"
                  className="mt-2 cursor-grab text-fg-muted active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4" aria-hidden="true" />
                </span>
                <LabelNameField
                  label={label}
                  labels={labels}
                  onRename={(next) => {
                    actions.onChange(label.id, { label: next });
                    setAnnouncement(`Etichetta rinominata: ${next}`);
                  }}
                />
                <span className="mt-0.5 shrink-0">
                  <ColorMenu
                    label={`Colore di «${label.label}»`}
                    value={label.colorId}
                    allowNone={false}
                    onChange={(colorId) => {
                      if (colorId) actions.onChange(label.id, { colorId });
                    }}
                  />
                </span>
                <span className="mt-2 shrink-0 text-xs text-fg-muted tabular-nums">
                  {count === 1 ? '1 progetto' : `${count} progetti`}
                </span>
                <span className="flex shrink-0 items-center">
                  {([-1, 1] as const).map((delta) => {
                    const controlId = `label-move-${delta}-${label.id}`;
                    const atEnd = delta === -1 ? index === 0 : index === labels.length - 1;
                    const Icon = delta === -1 ? ArrowUp : ArrowDown;
                    return (
                      <Button
                        key={delta}
                        id={controlId}
                        variant="ghost"
                        size="icon"
                        aria-disabled={atEnd}
                        aria-label={`Sposta l’etichetta ${label.label} più ${delta === -1 ? 'in alto' : 'in basso'}`}
                        title={delta === -1 ? 'Più in alto' : 'Più in basso'}
                        onClick={() => step(label, index, delta, controlId)}
                        className="aria-disabled:cursor-default aria-disabled:opacity-40"
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    );
                  })}
                  <Button
                    variant="danger-subtle"
                    size="icon"
                    aria-label={`Elimina l’etichetta ${label.label}`}
                    title="Elimina l’etichetta"
                    onClick={() => setToDelete(label)}
                  >
                    <Trash className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p id={helpId} className="sr-only">
        Alt e le frecce su e giù spostano l’etichetta del campo con il focus.
      </p>

      <form onSubmit={add} className="space-y-1">
        <label htmlFor={newId} className="text-xs font-semibold">
          Nuova etichetta, in fondo
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={newId}
            type="text"
            value={name}
            maxLength={LABEL_NAME_MAX}
            placeholder="Mobile"
            disabled={full}
            aria-invalid={newError ? true : undefined}
            aria-describedby={newError ? newErrorId : undefined}
            onChange={(event) => setName(event.target.value)}
            className={`${FIELD_CLASS} min-w-40 flex-1`}
          />
          <Button type="submit" disabled={full}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Aggiungi l’etichetta
          </Button>
        </div>
        {full && (
          <p className="text-xs text-fg-muted">
            Ci sono già {LABELS_MAX} etichette, il massimo: eliminane una per aggiungerne altre.
          </p>
        )}
        {newError && (
          <p id={newErrorId} role="alert" className="text-xs font-semibold text-danger">
            {newError}
          </p>
        )}
      </form>
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {toDelete && (
        <ConfirmDialog
          title={`Eliminare l’etichetta ${toDelete.label}?`}
          message={
            usage(toDelete.id) === 0
              ? 'Nessun progetto la usa. Sparisce per tutti i membri; la cronologia la ricorda.'
              : `${
                  usage(toDelete.id) === 1
                    ? 'Un progetto la usa e la perde'
                    : `${usage(toDelete.id)} progetti la usano e la perdono`
                }, per tutti i membri; la cronologia la ricorda.`
          }
          confirmLabel="Elimina"
          onConfirm={() => {
            actions.onDelete(toDelete.id);
            setAnnouncement(`Etichetta ${toDelete.label} eliminata`);
            setToDelete(null);
          }}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
