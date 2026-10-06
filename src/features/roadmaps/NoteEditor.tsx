import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import {
  PROJECT_NOTE_STATUSES,
  PROJECT_NOTE_STATUS_LABELS,
  PROJECT_NOTE_TEXT_MAX,
  splitList,
} from '../../domain/projectNotes';
import type { ProjectNoteContent } from '../../domain/projectNotes';
import type { ProjectNoteStatus } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { DATE_MAX, FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { SEGMENT, SEGMENTED, SEGMENT_OFF, SEGMENT_ON } from '../../shared/ui/segmented';
import { isIsoDate } from '../../utils/dateUtils';

interface NoteEditorProps {
  /** What the editor starts from: the project and, for a note being edited, its content. */
  initial: ProjectNoteContent;
  /** Owners and tags already written in the project, offered while typing. */
  suggestions: { owners: string[]; tags: string[] };
  /** Whether the options beyond the text are open; the quick add keeps them closed. */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  submitLabel: string;
  /** The editor empties after a note is added, and keeps the text while editing. */
  resetOnSubmit?: boolean;
  onSubmit: (content: ProjectNoteContent) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

/** The three states a note can have: none, to do, done. */
const STATUS_OPTIONS: { value: '' | ProjectNoteStatus; label: string }[] = [
  { value: '', label: 'Senza stato' },
  ...PROJECT_NOTE_STATUSES.map((value) => ({ value, label: PROJECT_NOTE_STATUS_LABELS[value] })),
];

/**
 * Writes a note of a project: the text and Enter are enough; «Altre opzioni» opens the state, the
 * deadline with its alert, the owners and the tags. Owners and tags are written apart by commas,
 * and the ones already used in the project are suggested.
 */
export function NoteEditor({
  initial,
  suggestions,
  expanded,
  onExpandedChange,
  submitLabel,
  resetOnSubmit = false,
  onSubmit,
  onCancel,
  autoFocus = false,
}: NoteEditorProps) {
  const [text, setText] = useState(initial.text);
  const [status, setStatus] = useState<'' | ProjectNoteStatus>(initial.status ?? '');
  const [dueOn, setDueOn] = useState(initial.dueOn ?? '');
  const [remind, setRemind] = useState(initial.remind === true);
  const [owners, setOwners] = useState((initial.owners ?? []).join(', '));
  const [tags, setTags] = useState((initial.tags ?? []).join(', '));
  const textId = useId();
  const dueId = useId();
  const ownersId = useId();
  const tagsId = useId();
  const optionsId = useId();
  const ownersListId = useId();
  const tagsListId = useId();
  const canSubmit = text.trim() !== '' && (dueOn === '' || isIsoDate(dueOn));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const content: ProjectNoteContent = { projectId: initial.projectId, text: text.trim() };
    if (status) content.status = status;
    if (dueOn) content.dueOn = dueOn;
    if (dueOn && remind) content.remind = true;
    const ownerList = splitList(owners);
    if (ownerList.length > 0) content.owners = ownerList;
    const tagList = splitList(tags);
    if (tagList.length > 0) content.tags = tagList;
    onSubmit(content);
    if (resetOnSubmit) {
      setText('');
      setStatus('');
      setDueOn('');
      setRemind(false);
      setOwners('');
      setTags('');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-start gap-2">
        <textarea
          id={textId}
          data-autofocus={autoFocus || undefined}
          rows={expanded ? 3 : 1}
          maxLength={PROJECT_NOTE_TEXT_MAX}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter adds the note; Shift + Enter goes to a new line.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          aria-label="Testo della nota"
          placeholder="Scrivi una nota e premi Invio…"
          className={`${FIELD_CLASS} min-w-0 flex-1 resize-y`}
        />
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={optionsId}
          onClick={() => onExpandedChange(!expanded)}
          title="Stato, scadenza, avviso, owner e tag"
          className="flex h-9.5 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-line-strong bg-surface px-2.5 text-xs font-semibold text-fg-muted hover:text-fg"
        >
          Altre opzioni
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        <Button type="submit" variant="primary" size="md" className="h-9.5" disabled={!canSubmit}>
          {!onCancel && <Plus className="h-4 w-4" aria-hidden="true" />}
          {submitLabel}
        </Button>
      </div>

      <div
        id={optionsId}
        hidden={!expanded}
        className="space-y-3 rounded-lg border border-line bg-surface-muted p-3"
      >
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <div>
            <span className={LABEL_CLASS}>Stato</span>
            <div role="group" aria-label="Stato della nota" className={SEGMENTED}>
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={status === option.value}
                  onClick={() => setStatus(option.value)}
                  className={`${SEGMENT} ${status === option.value ? SEGMENT_ON : SEGMENT_OFF}`}
                >
                  {status === option.value && (
                    <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                  )}
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor={dueId} className={LABEL_CLASS}>
              Scadenza
            </label>
            <input
              id={dueId}
              type="date"
              max={DATE_MAX}
              value={dueOn}
              onChange={(event) => setDueOn(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <label
            className={`flex cursor-pointer items-center gap-2 pb-2 text-sm ${dueOn ? '' : 'text-fg-muted'}`}
          >
            <input
              type="checkbox"
              checked={remind && dueOn !== ''}
              disabled={dueOn === ''}
              onChange={(event) => setRemind(event.target.checked)}
            />
            Avvisa alla scadenza
          </label>
        </div>
        <p className="text-xs text-fg-muted">
          Con l&apos;avviso, dal giorno della scadenza chi apre il calendario vede la nota finché
          non è fatta o chiusa, una volta per browser.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={ownersId} className={LABEL_CLASS}>
              Owner
            </label>
            <input
              id={ownersId}
              type="text"
              list={ownersListId}
              value={owners}
              onChange={(event) => setOwners(event.target.value)}
              placeholder="Nomi separati da virgola"
              className={FIELD_CLASS}
            />
            <datalist id={ownersListId}>
              {suggestions.owners.map((owner) => (
                <option key={owner} value={owner} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor={tagsId} className={LABEL_CLASS}>
              Tag
            </label>
            <input
              id={tagsId}
              type="text"
              list={tagsListId}
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="Parole separate da virgola"
              className={FIELD_CLASS}
            />
            <datalist id={tagsListId}>
              {suggestions.tags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </div>
        </div>
        {onCancel && (
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={onCancel}>
              Annulla
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
