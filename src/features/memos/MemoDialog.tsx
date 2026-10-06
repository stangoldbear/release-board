import { useId, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Lock, NotebookPen, Trash, X } from 'lucide-react';
import { TASK_COLORS } from '../../domain/colors';
import type { TaskColorId } from '../../domain/colors';
import {
  MEMO_BODY_MAX,
  MEMO_TITLE_MAX,
  followerAt,
  memoSuggestions,
  withMilestone,
} from '../../domain/memos';
import type { MemoContent } from '../../domain/memos';
import type { Memo, MemoAuthor } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Dialog } from '../../shared/ui/Dialog';
import { DATE_MAX, FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { isIsoDate, todayIso } from '../../utils/dateUtils';
import { MemoDot, MemoTitle, PrivateMark, ReminderBadge, memoSurface } from './memoUi';

interface MemoDialogProps {
  memo: Memo;
  /** The strip the note is chosen from, or its group, to pick its place in it. */
  strip: Memo[];
  /** The places are those of the note's group, among the notes of its author. */
  inGroup?: boolean;
  /** The note that follows it at a place; by default, in `strip`. */
  follower?: (index: number) => string | null;
  /** In a shared instance, the signed-in member: notes have an author and can be private. */
  me: MemoAuthor | null;
  /** The full name of who wrote the note, in a shared instance. */
  authorName: string | null;
  /** The note is no longer in the plan: nothing can be saved, the text can still be copied. */
  gone: boolean;
  /** Saves the content, and puts the note before `beforeId` when its place was changed. */
  onSave: (content: MemoContent, beforeId?: string | null) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Edits a free note: title, text, color, reminder, place in the strip and, for its author in a
 * shared instance, whether it is private. Mounted only while open.
 */
export function MemoDialog({
  memo,
  strip,
  inGroup = false,
  follower = (index) => followerAt(strip, memo.id, index),
  me,
  authorName,
  gone,
  onSave,
  onDelete,
  onClose,
}: MemoDialogProps) {
  const [title, setTitle] = useState(memo.title);
  const [body, setBody] = useState(memo.body ?? '');
  const [colorId, setColorId] = useState<TaskColorId | undefined>(memo.colorId);
  const [remindOn, setRemindOn] = useState(memo.remindOn ?? '');
  const [isPrivate, setIsPrivate] = useState(memo.private === true);
  // Null until a place is chosen: the strip may change meanwhile, and the note keeps its own.
  const [place, setPlace] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formId = useId();
  const titleId = useId();
  const bodyId = useId();
  const remindId = useId();
  const remindHintId = useId();
  const placeId = useId();
  const today = todayIso();
  const index = strip.findIndex((item) => item.id === memo.id);
  const suggestions = memoSuggestions(today);
  const suggestionsLabelId = useId();
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const isMine = me !== null && memo.author?.id === me.id;
  const author = me === null ? null : isMine ? 'te' : (authorName ?? 'un altro membro');

  const handleSuggestionKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = suggestions.length - 1;
    const target =
      event.key === 'ArrowRight'
        ? activeSuggestion === last
          ? 0
          : activeSuggestion + 1
        : event.key === 'ArrowLeft'
          ? activeSuggestion === 0
            ? last
            : activeSuggestion - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    setActiveSuggestion(target);
    event.currentTarget.querySelectorAll('button')[target]?.focus();
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || gone || (remindOn !== '' && !isIsoDate(remindOn))) return;
    const content: MemoContent = { title: title.trim() };
    if (body.trim()) content.body = body.trim();
    if (colorId) content.colorId = colorId;
    if (remindOn) content.remindOn = remindOn;
    if (isPrivate) content.private = true;
    onSave(content, place === null ? undefined : follower(place));
    onClose();
  };

  const preview = memoSurface({ colorId });

  const colorOption = (id: TaskColorId | undefined, name: string) => {
    const surface = memoSurface({ colorId: id });
    return (
      <button
        key={id ?? 'none'}
        type="button"
        onClick={() => setColorId(id)}
        aria-pressed={colorId === id}
        style={surface.style}
        className={`flex items-center gap-2 rounded-lg border-2 p-2 text-left text-xs font-medium transition-shadow ${
          surface.className
        } ${id ? '' : 'border-dashed'} ${colorId === id ? 'ring-2 ring-fg ring-offset-1 ring-offset-surface' : ''}`}
      >
        <span className="h-3 w-3 shrink-0 rounded-full border-2 border-current" />
        <span className="truncate">{name}</span>
      </button>
    );
  };

  return (
    <>
      <Dialog
        title={isPrivate ? 'Nota libera privata' : 'Nota libera'}
        description={author ? `Scritta da ${author}` : 'Titolo, testo, colore e promemoria'}
        icon={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-strong text-fg">
            <NotebookPen className="h-4 w-4" aria-hidden="true" />
          </div>
        }
        onClose={onClose}
        className="max-w-lg"
        footer={
          <>
            <Button
              variant="danger-subtle"
              className="mr-auto"
              disabled={gone}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash className="h-4 w-4" aria-hidden="true" />
              Elimina
            </Button>
            <Button onClick={onClose}>Annulla</Button>
            <Button variant="primary" type="submit" form={formId} disabled={!title.trim() || gone}>
              Salva
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={save} className="space-y-4">
          {gone && (
            <p
              role="alert"
              className="rounded-lg border border-warning bg-warning-soft p-3 text-sm text-fg"
            >
              Questa nota non c'è più: è stata eliminata, o resa privata da chi l'ha scritta. Le
              modifiche non si possono salvare, ma puoi ancora copiarne il testo.
            </p>
          )}
          <div className="rounded-lg border border-line bg-surface-muted p-3">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-fg-muted uppercase">
              Anteprima
            </span>
            <span
              style={preview.style}
              className={`inline-flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm shadow-2xs ${preview.className}`}
            >
              <MemoDot memo={{ colorId }} />
              <span className="min-w-0 wrap-break-word">
                <MemoTitle title={title.trim() || 'Titolo della nota'} />
              </span>
              {isPrivate && <PrivateMark />}
              {remindOn && <ReminderBadge remindOn={remindOn} today={today} />}
            </span>
          </div>

          <div>
            <label htmlFor={titleId} className={LABEL_CLASS}>
              Titolo *
            </label>
            <input
              id={titleId}
              data-autofocus
              type="text"
              required
              maxLength={MEMO_TITLE_MAX}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={FIELD_CLASS}
            />
            {/* One stop of the Tab key: the arrows move between the suggestions. */}
            <div
              role="toolbar"
              aria-labelledby={suggestionsLabelId}
              onKeyDown={handleSuggestionKey}
              className="mt-2 flex flex-wrap items-center gap-1.5"
            >
              <span id={suggestionsLabelId} className="mr-1 text-xs text-fg-muted">
                Suggeriti, dopo i due punti:
              </span>
              {suggestions.map((suggestion, at) => (
                <Button
                  key={suggestion}
                  size="sm"
                  tabIndex={at === activeSuggestion ? 0 : -1}
                  onFocus={() => setActiveSuggestion(at)}
                  onClick={() => setTitle((current) => withMilestone(current, suggestion))}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor={bodyId} className={LABEL_CLASS}>
              Testo
            </label>
            <textarea
              id={bodyId}
              rows={4}
              maxLength={MEMO_BODY_MAX}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Dettagli, link, chi se ne occupa…"
              className={FIELD_CLASS}
            />
          </div>

          <fieldset>
            <legend className={LABEL_CLASS}>Colore</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {colorOption(undefined, 'Nessuno')}
              {TASK_COLORS.map((color) => colorOption(color.id, color.name))}
            </div>
          </fieldset>

          <div>
            <label htmlFor={remindId} className={LABEL_CLASS}>
              Promemoria
            </label>
            <div className="flex items-center gap-2">
              <input
                id={remindId}
                type="date"
                max={DATE_MAX}
                value={remindOn}
                onChange={(event) => setRemindOn(event.target.value)}
                aria-describedby={remindHintId}
                className={`${FIELD_CLASS} flex-1`}
              />
              {remindOn && (
                <Button onClick={() => setRemindOn('')} aria-label="Rimuovi il promemoria">
                  <X className="h-4 w-4" aria-hidden="true" />
                  Rimuovi
                </Button>
              )}
            </div>
            <p id={remindHintId} className="mt-1 text-xs text-fg-muted">
              {isPrivate
                ? 'Facoltativo. Da quel giorno, quando apri il calendario vedi un avviso con questa nota, una volta per browser.'
                : 'Facoltativo. Da quel giorno, chi ha questa nota nella fila vede un avviso aprendo il calendario, una volta per browser.'}
            </p>
          </div>

          {isMine && (
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(event) => setIsPrivate(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Privata
                </span>
                <span className="block text-xs text-fg-muted">
                  La vedi solo tu: gli altri membri non la trovano nella fila, e quello che scrivi
                  non va nella cronologia né nei backup. Se era condivisa, la cronologia conserva
                  ciò che gli altri hanno già visto.
                </span>
              </span>
            </label>
          )}

          {index >= 0 && strip.length > 1 && (
            <div>
              <label htmlFor={placeId} className={LABEL_CLASS}>
                {inGroup ? 'Posizione nel gruppo' : 'Posizione nella fila'}
              </label>
              <select
                id={placeId}
                value={place ?? index}
                onChange={(event) => setPlace(Number(event.target.value))}
                className={FIELD_CLASS}
              >
                {strip.map((item, at) => (
                  <option key={item.id} value={at}>
                    {at === 0 ? 'Prima' : at === strip.length - 1 ? 'Ultima' : `${at + 1}ª`} di{' '}
                    {strip.length}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form>
      </Dialog>

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminare la nota?"
          message="La nota libera viene tolta dalla fila."
          itemTitle={memo.title}
          confirmLabel="Elimina"
          onConfirm={() => {
            setConfirmDelete(false);
            onDelete();
            onClose();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
