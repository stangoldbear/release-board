import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Info,
  Pencil,
  Plus,
  SlidersHorizontal,
  Star,
  Trash,
  X,
} from 'lucide-react';
import {
  FIELD_DESCRIPTION_MAX,
  FIELD_FLAG_INFO,
  FIELD_LABEL_MAX,
  FIELD_OPTIONS_MAX,
  FIELD_OPTION_LABEL_MAX,
  FIELD_TYPES,
  FIELD_TYPE_INFO,
  nextPosition,
  sortByPosition,
  uniqueId,
} from '../../domain/roadmapConfig';
import type { FieldOption, FieldType, ProjectField, RoadmapConfig } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Dialog } from '../../shared/ui/Dialog';
import { FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { HoverCard, useHoverCard } from '../../shared/ui/HoverCard';
import type { RoadmapConfigActions } from '../roadmaps/roadmapActions';

/** A word of the model in English, as the editor names types and flags, with its translation. */
function Term({ name, label }: { name: string; label: string }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5">
      <code className="rounded-sm bg-surface-strong px-1 text-xs font-semibold">{name}</code>
      <span className="text-sm">{label}</span>
    </span>
  );
}

interface Explained {
  title: string;
  description: string;
}

/** The flags a field can have, with their English name. */
const FLAGS = ['multiple', 'required', 'main'] as const;

interface FieldDialogProps {
  /** The field to edit; null for a new one. */
  field: ProjectField | null;
  config: RoadmapConfig;
  onSave: (field: ProjectField) => void;
  onClose: () => void;
}

/**
 * One custom field: its label and description, its type among the seven (named in English, with
 * the Italian word and what each holds a hover or a focus away), its flags, and for a choice the
 * values to choose from. A new field takes its id from the label.
 */
function FieldDialog({ field, config, onSave, onClose }: FieldDialogProps) {
  const [label, setLabel] = useState(field?.label ?? '');
  const [description, setDescription] = useState(field?.description ?? '');
  const [type, setType] = useState<FieldType>(field?.type ?? 'text');
  const [multiple, setMultiple] = useState(field?.multiple ?? false);
  const [required, setRequired] = useState(field?.required ?? false);
  const [main, setMain] = useState(field?.main ?? false);
  const [options, setOptions] = useState<FieldOption[]>(field?.options ?? []);
  const [optionDraft, setOptionDraft] = useState('');
  const formId = useId();
  const labelId = useId();
  const descriptionId = useId();
  const optionId = useId();
  const { card, triggerProps, cardProps } = useHoverCard<Explained>();
  const id = field?.id ?? uniqueId(label, config.fields);
  const valid = label.trim() !== '' && (type !== 'choice' || options.length > 0);

  const addOption = () => {
    const text = optionDraft.trim().slice(0, FIELD_OPTION_LABEL_MAX);
    if (!text || options.length >= FIELD_OPTIONS_MAX) return;
    setOptions([...options, { id: uniqueId(text, options), label: text }]);
    setOptionDraft('');
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    const saved: ProjectField = {
      id,
      label: label.trim(),
      type,
      multiple,
      required,
      main,
      position: field?.position ?? nextPosition(config.fields),
    };
    if (description.trim()) saved.description = description.trim();
    if (type === 'choice') saved.options = options;
    onSave(saved);
    onClose();
  };

  const info = (explained: Explained) => (
    <button
      type="button"
      aria-label={`${explained.title}: ${explained.description}`}
      {...triggerProps(explained)}
      className="ml-auto flex h-6 w-6 shrink-0 cursor-help items-center justify-center rounded-full text-fg-muted hover:bg-surface-strong hover:text-fg"
    >
      <Info className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );

  return (
    <Dialog
      title={field ? 'Campo dei progetti' : 'Nuovo campo'}
      description={`Chiave: ${id || '…'}`}
      onClose={onClose}
      className="max-w-xl"
      footer={
        <>
          <Button onClick={onClose}>Annulla</Button>
          <Button variant="primary" type="submit" form={formId} disabled={!valid}>
            {field ? 'Salva' : 'Aggiungi'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={save} className="space-y-4">
        <div>
          <label htmlFor={labelId} className={LABEL_CLASS}>
            Etichetta *
          </label>
          <input
            id={labelId}
            data-autofocus
            type="text"
            required
            maxLength={FIELD_LABEL_MAX}
            placeholder="es. Jira epics"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor={descriptionId} className={LABEL_CLASS}>
            Descrizione
          </label>
          <input
            id={descriptionId}
            type="text"
            maxLength={FIELD_DESCRIPTION_MAX}
            placeholder="Cosa va scritto qui, sotto il campo nella finestra del progetto"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={FIELD_CLASS}
          />
        </div>

        <fieldset>
          <legend className={LABEL_CLASS}>Tipo</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {FIELD_TYPES.map((option) => (
              <div
                key={option}
                className="flex items-center gap-2 rounded-lg border border-line p-2 hover:bg-surface-strong has-checked:border-accent has-checked:bg-accent-soft"
              >
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="field-type"
                    value={option}
                    checked={type === option}
                    disabled={
                      field !== null &&
                      field.type !== option &&
                      (field.type === 'choice' || option === 'choice')
                    }
                    onChange={() => setType(option)}
                  />
                  <Term name={option} label={FIELD_TYPE_INFO[option].label} />
                </label>
                {info({
                  title: `${option} (${FIELD_TYPE_INFO[option].label})`,
                  description: FIELD_TYPE_INFO[option].description,
                })}
              </div>
            ))}
          </div>
          {field !== null && (
            <p className="mt-1.5 text-xs text-fg-muted">
              Una lista di valori non si trasforma in un altro tipo, né il contrario: i valori già
              scritti nei progetti non si saprebbero più leggere.
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className={LABEL_CLASS}>Opzioni</legend>
          <div className="grid gap-1.5">
            {FLAGS.map((flag) => {
              const checked =
                flag === 'multiple' ? multiple : flag === 'required' ? required : main;
              const set =
                flag === 'multiple' ? setMultiple : flag === 'required' ? setRequired : setMain;
              const wording = FIELD_FLAG_INFO[flag];
              // For a list of values the request speaks of "exclusive" choices: the opposite flag.
              const label =
                type === 'choice' && flag === 'multiple' ? 'Additivi (più di uno)' : wording.label;
              return (
                <div
                  key={flag}
                  className="flex items-center gap-2 rounded-lg border border-line p-2 hover:bg-surface-strong has-checked:border-accent has-checked:bg-accent-soft"
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => set(event.target.checked)}
                    />
                    <Term name={flag} label={label} />
                  </label>
                  {info({ title: `${flag} (${label})`, description: wording.description })}
                </div>
              );
            })}
          </div>
          {type === 'choice' && !multiple && (
            <p className="mt-1.5 text-xs text-fg-muted">
              Senza «multiple» i valori sono esclusivi: se ne sceglie uno solo.
            </p>
          )}
        </fieldset>

        {type === 'choice' && (
          <fieldset className="space-y-2">
            <legend className={LABEL_CLASS}>Valori della lista *</legend>
            {options.length > 0 && (
              <ul className="space-y-1.5">
                {options.map((option) => (
                  <li
                    key={option.id}
                    className="flex items-center gap-2 rounded-md border border-line bg-surface-muted px-2.5 py-1.5 text-sm"
                  >
                    <span className="flex-1">{option.label}</span>
                    <code className="text-xs text-fg-muted">{option.id}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1"
                      onClick={() => setOptions(options.filter((item) => item.id !== option.id))}
                      aria-label={`Rimuovi ${option.label}`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                id={optionId}
                type="text"
                aria-label="Nuovo valore della lista"
                maxLength={FIELD_OPTION_LABEL_MAX}
                placeholder="Aggiungi un valore (es. QA)"
                value={optionDraft}
                onChange={(event) => setOptionDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addOption();
                  }
                }}
                className={`${FIELD_CLASS} flex-1`}
              />
              <Button onClick={addOption} disabled={optionDraft.trim() === ''}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Aggiungi valore
              </Button>
            </div>
            <p className="text-xs text-fg-muted">
              Togliere un valore non cancella la scelta fatta nei progetti, che resta nascosta
              finché il valore non torna con la stessa chiave.
            </p>
          </fieldset>
        )}
      </form>

      {card && (
        <HoverCard anchor={card.anchor} {...cardProps}>
          <p className="text-sm font-semibold">{card.item.title}</p>
          <p className="mt-1 text-xs text-fg-muted">{card.item.description}</p>
        </HoverCard>
      )}
    </Dialog>
  );
}

interface ProjectFieldsDialogProps {
  config: RoadmapConfig;
  actions: RoadmapConfigActions;
  onClose: () => void;
}

/**
 * The custom fields of the projects, in their order: each with its type, flags and description,
 * to move, edit or remove, and a button for a new one.
 */
export function ProjectFieldsDialog({ config, actions, onClose }: ProjectFieldsDialogProps) {
  const fields = sortByPosition(config.fields);
  const [editing, setEditing] = useState<ProjectField | null | 'new'>(null);
  const [toDelete, setToDelete] = useState<ProjectField | null>(null);

  // Moving a field swaps its position with its neighbour's: two documents change.
  const move = (field: ProjectField, step: -1 | 1) => {
    const at = fields.findIndex((item) => item.id === field.id);
    const other = fields[at + step];
    if (!other) return;
    // Equal positions, as after the defaults, would not swap: the order of the list is renumbered.
    if (field.position === other.position) {
      fields.forEach((item, index) => {
        const position = index === at ? at + step : index === at + step ? at : index;
        if (position !== item.position) actions.onSaveField({ ...item, position });
      });
      return;
    }
    actions.onSaveField({ ...field, position: other.position });
    actions.onSaveField({ ...other, position: field.position });
  };

  return (
    <>
      <Dialog
        title="Campi dei progetti"
        description="Roadmap · ogni progetto ha questi campi, nell'ordine della lista"
        icon={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-strong text-fg">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </div>
        }
        onClose={onClose}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="primary" className="mr-auto" onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuovo campo
            </Button>
            <Button onClick={onClose}>Chiudi</Button>
          </>
        }
      >
        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-fg-muted">
            Nessun campo: i progetti hanno solo titolo, date, stato, responsabile e descrizione.
          </p>
        ) : (
          <ol aria-label="Campi dei progetti" className="space-y-2">
            {fields.map((field, index) => (
              <li
                key={field.id}
                className="flex items-start gap-2 rounded-lg border border-line bg-surface p-2.5 text-sm"
              >
                <div className="flex shrink-0 flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1"
                    disabled={index === 0}
                    onClick={() => move(field, -1)}
                    aria-label={`Sposta «${field.label}» più in alto`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1"
                    disabled={index === fields.length - 1}
                    onClick={() => move(field, 1)}
                    aria-label={`Sposta «${field.label}» più in basso`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold">{field.label}</span>
                    {field.required && <span aria-hidden="true">*</span>}
                    {field.main && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-fg-muted">
                        <Star className="h-3 w-3" aria-hidden="true" />
                        principale
                      </span>
                    )}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
                    <code className="rounded-sm bg-surface-strong px-1 font-semibold">
                      {field.type}
                    </code>
                    <span>{FIELD_TYPE_INFO[field.type].label}</span>
                    {field.multiple && <span>· più valori</span>}
                    {field.required && <span>· almeno uno</span>}
                    {field.options && (
                      <span className="truncate">
                        · {field.options.map((option) => option.label).join(', ')}
                      </span>
                    )}
                  </p>
                  {field.description && (
                    <p className="mt-0.5 text-xs text-fg-muted">{field.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1.5"
                    onClick={() => setEditing(field)}
                    aria-label={`Modifica il campo «${field.label}»`}
                    title="Modifica"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1.5"
                    onClick={() => setToDelete(field)}
                    aria-label={`Elimina il campo «${field.label}»`}
                    title="Elimina"
                  >
                    <Trash className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Dialog>

      {editing && (
        <FieldDialog
          field={editing === 'new' ? null : editing}
          config={config}
          onSave={actions.onSaveField}
          onClose={() => setEditing(null)}
        />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Eliminare il campo?"
          message="Il campo sparisce dalla roadmap e dalla finestra dei progetti. I valori già scritti restano nei progetti, nascosti, e tornano se un campo con la stessa chiave viene ricreato."
          itemTitle={toDelete.label}
          confirmLabel="Elimina"
          onConfirm={() => {
            actions.onDeleteField(toDelete.id);
            setToDelete(null);
          }}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
