import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Users,
} from 'lucide-react';
import {
  MEMO_SCOPES,
  followerAt,
  followerInGroup,
  groupMemos,
  moveGroup,
} from '../../domain/memos';
import type { MemoGroup, MemoScope } from '../../domain/memos';
import type { Memo, MemoAuthor } from '../../domain/types';
import { Area } from '../../shared/ui/Area';
import { Button } from '../../shared/ui/Button';
import { RulesNotice } from '../../shared/ui/RulesNotice';
import { scaledTextStyle } from '../../shared/ui/textScale';
import type { TextScale } from '../../shared/ui/textScale';
import { ToggleChip } from '../../shared/ui/ToggleChip';
import { useListDrag } from '../../shared/useListDrag';
import type { Axis } from '../../shared/useListDrag';
import { MemoCard, memoElementId } from './MemoCard';
import { NewMemoForm } from './NewMemoForm';

/** Free notes travel with their own type, so that nothing else can be dropped among them. */
const MEMO_DRAG_TYPE = 'application/x-release-board-memo';
/** The groups of notes too, so that a group never lands among the notes and the other way round. */
const GROUP_DRAG_TYPE = 'application/x-release-board-memo-group';
/** The list of the notes when they are not grouped. */
const WHOLE_STRIP = 'strip';
/** The list of the groups. */
const GROUPS = 'groups';

/** In a shared instance, notes have an author: the strip shows the user's own, or all of them. */
export interface MemoSharing {
  me: MemoAuthor;
  /** The full name of an author, or the username when the name is not known. */
  nameOf: (author: MemoAuthor) => string;
  scope: MemoScope;
  /** How many notes each scope shows. */
  counts: Record<MemoScope, number>;
  onScopeChange: (scope: MemoScope) => void;
  /** The notes in a group for each author. */
  grouped: boolean;
  onToggleGrouped: () => void;
  /** The ids of the authors, in the order of their groups. */
  groupOrder: string[];
  onGroupOrderChange: (order: string[]) => void;
}

const SCOPE_LABELS: Record<MemoScope, string> = { mine: 'Le mie', all: 'Tutte' };

interface MemoStripProps {
  /** The element id of the area. */
  id: string;
  /** The notes to show, in the order of the strip: those of the scope, or those the search finds. */
  memos: Memo[];
  /** How many notes the search looks through: all those the user can see. */
  total: number;
  /** Null in the local mode, where notes have no author. */
  sharing: MemoSharing | null;
  /** The published security rules do not know free notes yet: the area says so, and no more. */
  unavailable?: boolean;
  /** While searching the strip shows only some notes, and they do not move. */
  searching: boolean;
  /** One line that scrolls, or every note with its text, one under the other. */
  expanded: boolean;
  /** Size of the notes' text, 1 being the normal one, and whether they are compact. */
  textScale: TextScale;
  compact: boolean;
  onToggleExpanded: () => void;
  /** Adds a note at the end and returns its id. */
  onAdd: (title: string, isPrivate: boolean) => string;
  onOpen: (memo: Memo) => void;
  /** Puts a note right before another one, or at the end when `beforeId` is null. */
  onMove: (memoId: string, beforeId: string | null) => void;
  today: string;
}

/** The handle that moves a group, to give it the focus back after a move. */
function groupHandleId(key: string): string {
  return `memo-group-${key || 'none'}`;
}

/** Alt and an arrow: -1 for the one before, 1 for the one after, 0 for any other key. */
function altArrowStep(event: KeyboardEvent): -1 | 0 | 1 {
  if (!event.altKey) return 0;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') return -1;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') return 1;
  return 0;
}

/** Where a dragged item would land: a line before or after the item under the pointer. */
function DropLine({ axis, side }: { axis: Axis; side: 'before' | 'after' }) {
  const place =
    axis === 'x'
      ? `inset-y-0 w-0.5 ${side === 'before' ? '-left-1' : '-right-1'}`
      : `inset-x-0 h-0.5 ${side === 'before' ? '-top-1' : '-bottom-1'}`;
  return <span aria-hidden="true" className={`absolute rounded-full bg-link ${place}`} />;
}

/**
 * The area of the free notes: on one line that scrolls, or expanded with their text, one under
 * the other. In a shared instance they can be grouped by author, in groups whose order the user
 * chooses. A title and Enter add a note at the end; a click opens it. With a mouse notes and
 * groups move by dragging, from the keyboard with Alt and the arrows, and a note also from its own
 * window, on a phone too.
 */
export function MemoStrip({
  id,
  memos,
  total,
  sharing,
  unavailable = false,
  searching,
  expanded,
  textScale,
  compact,
  onToggleExpanded,
  onAdd,
  onOpen,
  onMove,
  today,
}: MemoStripProps) {
  const [announcement, setAnnouncement] = useState('');
  const [openOnPhone, setOpenOnPhone] = useState(false);
  const contentId = useId();
  const helpId = useId();
  const groupHelpId = useId();
  // A new note goes at the end, maybe past the edge of the strip: it is brought into view once
  // the plan has it.
  const added = useRef<string | null>(null);

  const groups = sharing?.grouped ? groupMemos(memos, sharing.groupOrder) : null;
  const groupKeys = groups?.map((group) => group.key) ?? [];
  const listOf = (key: string) =>
    key === WHOLE_STRIP ? memos : (groups?.find((group) => group.key === key)?.memos ?? []);
  const groupName = (group: MemoGroup) =>
    group.author && sharing
      ? `${sharing.nameOf(group.author)}${group.author.id === sharing.me.id ? ' (tu)' : ''}`
      : 'Senza autore';

  useEffect(() => {
    const element = added.current && document.getElementById(memoElementId(added.current));
    if (!element) return;
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    added.current = null;
  }, [memos]);

  const add = (title: string, isPrivate: boolean) => {
    const memoId = onAdd(title, isPrivate);
    added.current = searching ? null : memoId;
    setAnnouncement(`Nota libera aggiunta${isPrivate ? ', privata' : ''}: «${title}»`);
  };

  /** Moves a note to `index` of its list, the whole strip or its group, and keeps the focus on it. */
  const moveNote = (memoId: string, list: string, index: number) => {
    const notes = listOf(list);
    const memo = notes.find((item) => item.id === memoId);
    if (!memo) return;
    const beforeId =
      list === WHOLE_STRIP
        ? followerAt(memos, memoId, index)
        : followerInGroup(memos, notes, memoId, index);
    onMove(memoId, beforeId);
    setAnnouncement(`«${memo.title}» in posizione ${index + 1} di ${notes.length}`);
    window.requestAnimationFrame(() => document.getElementById(memoElementId(memoId))?.focus());
  };

  /**
   * Puts a group at `index` among those shown, and keeps the focus on its handle, or on the
   * control given by `focusId`.
   */
  const moveGroupTo = (key: string, _list: string, index: number, focusId = groupHandleId(key)) => {
    const group = groups?.find((item) => item.key === key);
    if (!sharing || !group) return;
    sharing.onGroupOrderChange(moveGroup(sharing.groupOrder, groupKeys, key, index));
    setAnnouncement(
      `Gruppo di ${groupName(group)} in posizione ${index + 1} di ${groupKeys.length}`,
    );
    window.requestAnimationFrame(() => document.getElementById(focusId)?.focus());
  };

  const noteDrag = useListDrag(MEMO_DRAG_TYPE, moveNote);
  const groupDrag = useListDrag(GROUP_DRAG_TYPE, moveGroupTo);

  const handleNoteKey = (event: KeyboardEvent, memo: Memo, list: string, index: number) => {
    const step = altArrowStep(event);
    if (step === 0) return;
    // Alt and the side arrows are also the browser's back and forward: never on a note.
    event.preventDefault();
    const target = index + step;
    if (searching) setAnnouncement('Durante la ricerca le note non si spostano');
    else if (target < 0) setAnnouncement(`«${memo.title}» è già la prima`);
    else if (target >= listOf(list).length) setAnnouncement(`«${memo.title}» è già l'ultima`);
    else moveNote(memo.id, list, target);
  };

  /** Moves a group one place before or after, or says that it cannot. */
  const stepGroup = (group: MemoGroup, index: number, step: -1 | 1, focusId?: string) => {
    const target = index + step;
    if (target < 0) setAnnouncement(`Il gruppo di ${groupName(group)} è già il primo`);
    else if (target >= groupKeys.length)
      setAnnouncement(`Il gruppo di ${groupName(group)} è già l'ultimo`);
    else moveGroupTo(group.key, GROUPS, target, focusId);
  };

  const handleGroupKey = (event: KeyboardEvent, group: MemoGroup, index: number) => {
    const step = altArrowStep(event);
    if (step === 0) return;
    event.preventDefault();
    stepGroup(group, index, step);
  };

  /** The notes of a list, in a row that scrolls, or one under the other when expanded. */
  const renderNotes = (list: string, notes: Memo[]) => {
    const axis: Axis = expanded ? 'y' : 'x';
    const ids = notes.map((memo) => memo.id);
    const slot = noteDrag.slot(list);
    const movable = !searching && notes.length > 1;
    return (
      <ul
        {...noteDrag.container}
        className={
          expanded
            ? 'flex min-w-0 flex-1 flex-col gap-1.5'
            : 'flex min-w-0 flex-1 items-start gap-1.5 overflow-x-auto px-1 pt-1 pb-1.5'
        }
      >
        {notes.map((memo, index) => (
          <li
            key={memo.id}
            {...noteDrag.target(list, ids, index, axis)}
            className={`relative ${expanded ? 'w-full' : 'shrink-0'}`}
          >
            {slot === index && <DropLine axis={axis} side="before" />}
            {slot === index + 1 && index === notes.length - 1 && (
              <DropLine axis={axis} side="after" />
            )}
            <MemoCard
              memo={memo}
              expanded={expanded}
              today={today}
              // Grouped, the group says who wrote its notes.
              authorName={sharing && memo.author && !groups ? sharing.nameOf(memo.author) : null}
              meId={sharing?.me.id ?? null}
              movable={movable}
              dragging={noteDrag.dragged === memo.id}
              describedBy={helpId}
              onOpen={() => onOpen(memo)}
              onKeyDown={(event) => handleNoteKey(event, memo, list, index)}
              {...noteDrag.source(memo.id, list)}
            />
          </li>
        ))}
      </ul>
    );
  };

  /**
   * The notes by author: rows of notes one under the other, or, expanded, columns side by side.
   * Each group starts with its author, and its handle when there are groups to move among.
   */
  const renderGroups = (shown: MemoGroup[]) => {
    const axis: Axis = expanded ? 'x' : 'y';
    const slot = groupDrag.slot(GROUPS);
    const movable = shown.length > 1;
    return (
      <div
        {...groupDrag.container}
        className={
          expanded
            ? 'flex min-w-0 flex-1 items-start gap-3 overflow-auto p-1 sm:max-h-[40vh]'
            : 'flex min-w-0 flex-1 flex-col gap-1 p-1'
        }
      >
        {shown.map((group, index) => {
          const name = groupName(group);
          return (
            <div
              key={group.key}
              role="group"
              aria-label={`Note di ${name}`}
              {...groupDrag.target(GROUPS, groupKeys, index, axis)}
              className={`relative ${
                expanded
                  ? 'flex w-[min(16rem,75vw)] shrink-0 flex-col gap-1.5'
                  : 'flex min-w-0 items-start gap-2'
              } ${groupDrag.dragged === group.key ? 'opacity-50' : ''}`}
            >
              {slot === index && <DropLine axis={axis} side="before" />}
              {slot === index + 1 && index === shown.length - 1 && (
                <DropLine axis={axis} side="after" />
              )}
              <div
                draggable={movable}
                {...(movable ? groupDrag.source(group.key, GROUPS) : {})}
                className={`flex shrink-0 items-center gap-1 text-xs ${
                  expanded ? 'border-b border-line pb-1' : 'w-28 pt-1.5 sm:w-36'
                } ${movable ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                {movable && (
                  <button
                    type="button"
                    id={groupHandleId(group.key)}
                    aria-label={`Sposta il gruppo di ${name}`}
                    aria-describedby={groupHelpId}
                    aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown"
                    title="Trascina per cambiare l'ordine dei gruppi"
                    onKeyDown={(event) => handleGroupKey(event, group, index)}
                    className="-ml-1 shrink-0 cursor-grab rounded p-1 text-fg-muted hover:bg-surface-strong hover:text-fg active:cursor-grabbing"
                  >
                    <GripVertical className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                <span className="min-w-0 truncate font-bold" title={name}>
                  {name}
                </span>
                <span className="shrink-0 text-fg-muted tabular-nums">
                  <span aria-hidden="true">{group.memos.length}</span>
                  <span className="sr-only">
                    {group.memos.length === 1 ? '1 nota' : `${group.memos.length} note`}
                  </span>
                </span>
                {/* Also with a finger: the arrows move the group before or after the others. */}
                {movable && (
                  <span className="ml-auto flex shrink-0 items-center">
                    {([-1, 1] as const).map((step) => {
                      const Icon =
                        step === -1
                          ? expanded
                            ? ChevronLeft
                            : ChevronUp
                          : expanded
                            ? ChevronRight
                            : ChevronDown;
                      const controlId = `${groupHandleId(group.key)}-${step === -1 ? 'before' : 'after'}`;
                      const atEnd = step === -1 ? index === 0 : index === shown.length - 1;
                      return (
                        <button
                          key={step}
                          type="button"
                          id={controlId}
                          aria-disabled={atEnd}
                          aria-label={`Sposta ${step === -1 ? 'prima' : 'dopo'} il gruppo di ${name}`}
                          title={step === -1 ? 'Sposta il gruppo prima' : 'Sposta il gruppo dopo'}
                          onClick={() => stepGroup(group, index, step, controlId)}
                          className="cursor-pointer rounded p-1 text-fg-muted hover:bg-surface-strong hover:text-fg aria-disabled:cursor-default aria-disabled:opacity-50"
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </span>
                )}
              </div>
              {renderNotes(group.key, group.memos)}
            </div>
          );
        })}
      </div>
    );
  };

  // On phones the notes start closed, so that the calendar is in view; a search opens them.
  const shownOnPhone = openOnPhone || searching ? 'flex' : 'hidden';

  const controls = (
    <div className={`flex-wrap items-center gap-2 max-sm:w-full sm:flex ${shownOnPhone}`}>
      <NewMemoForm canBePrivate={sharing !== null} empty={memos.length === 0} onAdd={add} />
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
      {sharing && memos.length > 0 && (
        <ToggleChip
          pressed={sharing.grouped}
          onClick={sharing.onToggleGrouped}
          title="Raggruppa le note per utente"
        >
          <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Per utente
        </ToggleChip>
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
  );

  if (unavailable) {
    return (
      <Area id={id} title="Note">
        <RulesNotice what="Le note libere" />
      </Area>
    );
  }

  return (
    <Area
      id={id}
      title="Note"
      actions={
        <>
          {searching && (
            <span className="text-xs text-fg-muted">
              {memos.length} di {total}
            </span>
          )}
          {!searching && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto sm:hidden"
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
          {controls}
        </>
      }
    >
      <div
        id={contentId}
        data-compact={compact || undefined}
        style={scaledTextStyle(textScale, compact)}
        className={`min-h-10 rounded-xl border border-line bg-surface p-1 shadow-2xs sm:flex ${shownOnPhone}`}
      >
        {memos.length > 0 &&
          (groups ? (
            renderGroups(groups)
          ) : (
            // Expanded, the notes stop at 40% of the screen, so that the calendars stay in view.
            <div
              className={`flex min-w-0 flex-1 ${expanded ? 'p-1 sm:max-h-[40vh] sm:overflow-y-auto' : ''}`}
            >
              {renderNotes(WHOLE_STRIP, memos)}
            </div>
          ))}
        {memos.length === 0 && (
          <p className="self-center px-2 py-1 text-xs text-fg-muted">
            {searching
              ? 'Nessuna nota libera con questo testo.'
              : 'Nessuna nota: scrivine una qui sopra e premi Invio.'}
          </p>
        )}
      </div>

      <p id={helpId} className="sr-only">
        Invio apre la nota. Alt e le frecce la spostano prima o dopo nella fila.
      </p>
      <p id={groupHelpId} className="sr-only">
        Alt e le frecce spostano il gruppo prima o dopo gli altri.
      </p>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </Area>
  );
}
