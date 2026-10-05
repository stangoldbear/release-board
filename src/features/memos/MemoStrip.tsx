import { useEffect, useId, useRef, useState } from 'react';
import type { DragEvent, FormEvent, KeyboardEvent } from 'react';
import { Check, ChevronDown, ChevronUp, Lock, LockOpen, NotebookPen, Plus } from 'lucide-react';
import { MEMO_SCOPES, MEMO_TITLE_MAX, followerAt } from '../../domain/memos';
import type { MemoScope } from '../../domain/memos';
import type { Memo, MemoAuthor } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import {
  MemoAuthorName,
  MemoDot,
  MemoTitle,
  PrivateMark,
  ReminderBadge,
  memoOwnership,
  memoSurface,
  reminderText,
} from './memoUi';

/** Free notes travel with their own type, so that nothing else can be dropped among them. */
const MEMO_DRAG_TYPE = 'application/x-release-board-memo';

/** In a shared instance, notes have an author: the strip shows the user's own, or all of them. */
export interface MemoSharing {
  me: MemoAuthor;
  scope: MemoScope;
  /** How many notes each scope shows. */
  counts: Record<MemoScope, number>;
  onScopeChange: (scope: MemoScope) => void;
}

const SCOPE_LABELS: Record<MemoScope, string> = { mine: 'Le mie', all: 'Tutte' };

interface MemoStripProps {
  /** The notes to show, in the order of the strip: those of the scope, or those the search finds. */
  memos: Memo[];
  /** How many notes the search looks through: all those the user can see. */
  total: number;
  /** Null in the local mode, where notes have no author. */
  sharing: MemoSharing | null;
  /** While searching the strip shows only some notes, and they do not move. */
  searching: boolean;
  /** One line that scrolls, or every note with its text. */
  expanded: boolean;
  onToggleExpanded: () => void;
  /** Adds a note at the end and returns its id. */
  onAdd: (title: string, isPrivate: boolean) => string;
  onOpen: (memo: Memo) => void;
  /** Puts a note right before another one, or at the end when `beforeId` is null. */
  onMove: (memoId: string, beforeId: string | null) => void;
  today: string;
}

/** The element of a note in the strip, to give it the focus. */
export function memoElementId(memoId: string): string {
  return `memo-${memoId}`;
}

/** The field that adds a note. */
export const NEW_MEMO_ID = 'new-memo-title';

/**
 * Free notes one after the other, under the search: on one line that scrolls, or expanded with
 * their text. A title and Enter add one at the end; a click opens it. With a mouse they move by
 * dragging, from the keyboard with Alt and the arrows, on a phone from the note's own window.
 */
export function MemoStrip({
  memos,
  total,
  sharing,
  searching,
  expanded,
  onToggleExpanded,
  onAdd,
  onOpen,
  onMove,
  today,
}: MemoStripProps) {
  const [draft, setDraft] = useState('');
  const [draftPrivate, setDraftPrivate] = useState(false);
  /** Where a dragged note would land: before the note at this index, or after the last. */
  const [dropSlot, setDropSlot] = useState<number | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [openOnPhone, setOpenOnPhone] = useState(false);
  const headingId = useId();
  const contentId = useId();
  const helpId = useId();
  const movable = !searching && memos.length > 1;
  // A new note goes at the end, maybe past the edge of the strip: it is brought into view once
  // the plan has it.
  const added = useRef<string | null>(null);

  useEffect(() => {
    const element = added.current && document.getElementById(memoElementId(added.current));
    if (!element) return;
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    added.current = null;
  }, [memos]);

  const add = (event: FormEvent) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    const id = onAdd(title, draftPrivate);
    added.current = searching ? null : id;
    setAnnouncement(`Nota libera aggiunta${draftPrivate ? ', privata' : ''}: «${title}»`);
    // The padlock stays as it is: several private notes in a row are not shared by mistake.
    setDraft('');
  };

  /** Moves a note so that it ends up at `index` of the strip, and keeps the focus on it. */
  const move = (memo: Memo, index: number) => {
    onMove(memo.id, followerAt(memos, memo.id, index));
    setAnnouncement(`«${memo.title}» in posizione ${index + 1} di ${memos.length}`);
    window.requestAnimationFrame(() => document.getElementById(memoElementId(memo.id))?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent, memo: Memo, index: number) => {
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!event.altKey || step === 0) return;
    // Alt and an arrow are also the browser's back and forward: never on a note.
    event.preventDefault();
    const target = index + step;
    if (searching) setAnnouncement('Durante la ricerca le note non si spostano');
    else if (target < 0) setAnnouncement(`«${memo.title}» è già la prima`);
    else if (target >= memos.length) setAnnouncement(`«${memo.title}» è già l'ultima`);
    else move(memo, target);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>, index: number) => {
    if (!dragged || !event.dataTransfer.types.includes(MEMO_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const box = event.currentTarget.getBoundingClientRect();
    const slot = event.clientX < box.left + box.width / 2 ? index : index + 1;
    if (slot !== dropSlot) setDropSlot(slot);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    const from = memos.findIndex((memo) => memo.id === dragged);
    const memo = memos[from];
    if (memo && dropSlot !== null) {
      // The slot counts the dragged note too; the index of a move does not.
      const index = dropSlot > from ? dropSlot - 1 : dropSlot;
      if (index !== from) move(memo, index);
    }
    setDropSlot(null);
    setDragged(null);
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex shrink-0 items-center justify-between gap-2 sm:min-h-8">
        <h2
          id={headingId}
          className="flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase"
        >
          <NotebookPen className="h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
          Note libere
          {searching && (
            <span className="font-normal tracking-normal text-fg-muted normal-case">
              {memos.length} di {total}
            </span>
          )}
        </h2>
        {/* On phones the notes start closed, so that the calendar is in view; a search opens them. */}
        {!searching && (
          <Button
            variant="ghost"
            size="sm"
            className="sm:hidden"
            aria-expanded={openOnPhone}
            aria-controls={contentId}
            onClick={() => setOpenOnPhone((value) => !value)}
          >
            {openOnPhone ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {openOnPhone ? 'Nascondi' : `Mostra (${memos.length})`}
          </Button>
        )}
      </div>

      <div
        id={contentId}
        className={`min-w-0 flex-1 flex-col gap-2 sm:flex sm:flex-row sm:items-start ${
          openOnPhone || searching ? 'flex' : 'hidden'
        }`}
      >
        {(memos.length > 0 || searching) && (
          <ul
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                setDropSlot(null);
            }}
            className={`flex min-w-0 flex-1 items-start gap-2 ${
              // Expanded, the notes stop at 40% of the screen, so that the calendar is not pushed away.
              expanded ? 'flex-wrap sm:max-h-[40vh] sm:overflow-y-auto' : 'overflow-x-auto pb-1'
            }`}
          >
            {memos.map((memo, index) => (
              <li
                key={memo.id}
                onDragOver={(event) => handleDragOver(event, index)}
                onDrop={handleDrop}
                className={`relative shrink-0 ${expanded ? 'w-full sm:w-64' : ''}`}
              >
                {dropSlot === index && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 -left-1.5 w-0.5 rounded-full bg-link"
                  />
                )}
                {dropSlot === index + 1 && index === memos.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 -right-1.5 w-0.5 rounded-full bg-link"
                  />
                )}
                <button
                  type="button"
                  id={memoElementId(memo.id)}
                  draggable={movable}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(MEMO_DRAG_TYPE, memo.id);
                    event.dataTransfer.effectAllowed = 'move';
                    setDragged(memo.id);
                  }}
                  onDragEnd={() => {
                    setDropSlot(null);
                    setDragged(null);
                  }}
                  onClick={() => onOpen(memo)}
                  onKeyDown={(event) => handleKeyDown(event, memo, index)}
                  aria-describedby={movable ? helpId : undefined}
                  aria-keyshortcuts={movable ? 'Alt+ArrowLeft Alt+ArrowRight' : undefined}
                  title={
                    movable
                      ? 'Clic per aprirla, trascinala per cambiarle posto'
                      : 'Clic per aprirla'
                  }
                  aria-label={[
                    memo.title,
                    expanded && memo.body ? memo.body : null,
                    memo.remindOn ? reminderText(memo.remindOn, today) : null,
                    memoOwnership(memo, sharing?.me.id ?? null),
                  ]
                    .filter(Boolean)
                    .join('; ')}
                  style={memoSurface(memo).style}
                  className={`flex w-full cursor-pointer flex-col gap-1 rounded-lg border px-2.5 py-1.5 text-left text-xs shadow-2xs hover:shadow-md ${
                    memoSurface(memo).className
                  } ${movable ? 'active:cursor-grabbing' : ''} ${dragged === memo.id ? 'opacity-50' : ''}`}
                >
                  <span className="flex w-full items-center gap-2">
                    <MemoDot memo={memo} />
                    <span
                      className={`text-sm ${expanded ? 'min-w-0 flex-1 wrap-break-word' : 'max-w-72 truncate'}`}
                    >
                      <MemoTitle title={memo.title} />
                    </span>
                    {memo.private && <PrivateMark />}
                    {memo.remindOn && <ReminderBadge remindOn={memo.remindOn} today={today} />}
                    {sharing && memo.author && memo.author.id !== sharing.me.id && (
                      <MemoAuthorName login={memo.author.login} />
                    )}
                  </span>
                  {expanded && memo.body && (
                    <span className="whitespace-pre-line wrap-break-word">{memo.body}</span>
                  )}
                </button>
              </li>
            ))}

            {searching && memos.length === 0 && (
              <li className="py-1.5 text-xs text-fg-muted">
                Nessuna nota libera con questo testo.
              </li>
            )}
          </ul>
        )}

        {/* Outside the list, so that scrolling the notes never hides them. */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                  : memos.length === 0 && !searching
                    ? 'Scrivi una nota e premi Invio…'
                    : 'Nuova nota…'
              }
              className="min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs placeholder:text-fg-muted sm:w-48 sm:flex-none"
            />
            {sharing && (
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
          {sharing && (sharing.counts.all > sharing.counts.mine || sharing.scope === 'all') && (
            <div
              role="group"
              aria-label="Note da mostrare"
              className="flex items-center rounded-lg border border-line bg-surface-strong p-0.5"
            >
              {MEMO_SCOPES.map((scope) => {
                const pressed = sharing.scope === scope;
                return (
                  <button
                    key={scope}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => sharing.onScopeChange(scope)}
                    className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                      pressed ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {pressed && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
                    {SCOPE_LABELS[scope]}
                    <span className="font-normal tabular-nums">{sharing.counts[scope]}</span>
                  </button>
                );
              })}
            </div>
          )}
          {memos.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={expanded}
              aria-label={expanded ? 'Riduci le note libere' : 'Espandi le note libere'}
              onClick={onToggleExpanded}
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {expanded ? 'Riduci' : 'Espandi'}
            </Button>
          )}
        </div>
      </div>

      <p id={helpId} className="sr-only">
        Invio apre la nota. Alt e le frecce sinistra e destra la spostano nella fila.
      </p>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
