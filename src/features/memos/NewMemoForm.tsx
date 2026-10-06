import { useState } from 'react';
import type { FormEvent } from 'react';
import { Lock, LockOpen, Plus } from 'lucide-react';
import { MEMO_TITLE_MAX } from '../../domain/memos';
import { Button } from '../../shared/ui/Button';

/** The field that adds a note. */
export const NEW_MEMO_ID = 'new-memo-title';

interface NewMemoFormProps {
  /** In a shared instance a note can be private: the padlock beside the field. */
  canBePrivate: boolean;
  /** No note yet: the field says how to add one. */
  empty: boolean;
  /** Adds the note; the field empties, and the padlock stays as it is. */
  onAdd: (title: string, isPrivate: boolean) => void;
}

/**
 * A title and Enter add a note at the end. The padlock stays closed after a private note, so that
 * several private notes in a row are not shared by mistake.
 */
export function NewMemoForm({ canBePrivate, empty, onAdd }: NewMemoFormProps) {
  const [draft, setDraft] = useState('');
  const [draftPrivate, setDraftPrivate] = useState(false);

  const add = (event: FormEvent) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    onAdd(title, canBePrivate && draftPrivate);
    setDraft('');
  };

  return (
    <form onSubmit={add} className="flex items-center gap-1.5 max-sm:w-full">
      <input
        id={NEW_MEMO_ID}
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={MEMO_TITLE_MAX}
        aria-label={draftPrivate ? 'Nuova nota libera privata' : 'Nuova nota libera'}
        placeholder={
          draftPrivate
            ? 'Nuova nota privata…'
            : empty
              ? 'Scrivi una nota e premi Invio…'
              : 'Nuova nota…'
        }
        className="min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs placeholder:text-fg-muted sm:w-48 sm:flex-none"
      />
      {canBePrivate && (
        <button
          type="button"
          aria-pressed={draftPrivate}
          onClick={() => setDraftPrivate((value) => !value)}
          title={draftPrivate ? 'Privata: la vedi solo tu' : 'Condivisa con i membri'}
          className={`flex h-7.5 w-7.5 shrink-0 cursor-pointer items-center justify-center rounded-lg border ${
            draftPrivate
              ? 'border-link bg-accent-soft text-fg'
              : 'border-line-strong bg-surface text-fg-muted hover:text-fg'
          }`}
        >
          {draftPrivate ? (
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <LockOpen className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span className="sr-only">Privata</span>
        </button>
      )}
      <Button type="submit" size="sm" disabled={draft.trim() === ''}>
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Aggiungi
      </Button>
    </form>
  );
}
