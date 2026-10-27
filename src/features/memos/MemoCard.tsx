import type { DragEvent, KeyboardEvent } from 'react';
import type { TaskColorId } from '../../domain/colors';
import type { NoteShape, NotesLayout } from '../../domain/notesLook';
import type { Memo } from '../../domain/types';
import { CURRENT_RESULT, useIsCurrentResult } from '../../shared/ui/Highlight';
import {
  MemoAuthorLine,
  MemoDot,
  MemoTitle,
  PinnedMark,
  PrivateMark,
  ReminderBadge,
  memoOwnership,
  memoSurface,
  noteShapeClass,
  plainEdge,
  reminderText,
} from './memoUi';
import { useDateFormat } from '../..//shared/dateFormat';
import { Markdown } from '../../shared/ui/Markdown';
import { markdownToPlainText } from '../../utils/markdown';

/** The element of a note, to give it the focus. */
export function memoElementId(memoId: string): string {
  return `memo-${memoId}`;
}

interface MemoCardProps {
  memo: Memo;
  /** With its text, rather than the title alone on one line. */
  expanded: boolean;
  /** Post-it, card or plain, as this browser draws the notes. */
  shape: NoteShape;
  /** How the board lays the notes out: in a grid or a list the text is cut after a few lines. */
  layout: NotesLayout;
  /** The color of a note without one: the yellow of the post-its, or none. */
  paperColor: TaskColorId | undefined;
  /** Its place among the notes shown, which tilts a post-it one way or the other. */
  index: number;
  today: string;
  /** Who wrote it, in full; null in the local mode, where notes have no author. */
  authorName: string | null;
  /** The signed-in member, whose own notes do not say "di …" to screen readers. */
  meId: string | null;
  /** It can be dragged, and moved with Alt and the arrows. */
  movable: boolean;
  /** It is being dragged: it fades. */
  dragging: boolean;
  /** Id of the text that explains the keyboard commands. */
  describedBy: string;
  onOpen: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
}

/**
 * A free note: the padlock first when it is private, its color, the title and the reminder, then
 * who wrote it on a line of its own, and the text when expanded. A click opens it.
 */
export function MemoCard({
  memo,
  expanded,
  shape,
  layout,
  paperColor,
  index,
  today,
  authorName,
  meId,
  movable,
  dragging,
  describedBy,
  onOpen,
  onKeyDown,
  onDragStart,
  onDragEnd,
}: MemoCardProps) {
  const dateFormat = useDateFormat();
  // A plain note keeps the page's colors, with a band of its own.
  const surface =
    shape === 'plain'
      ? { style: plainEdge(memo, paperColor), className: 'bg-surface text-fg' }
      : memoSurface(memo, paperColor);
  const clamp = !expanded
    ? ''
    : layout === 'grid'
      ? 'line-clamp-6'
      : layout === 'list'
        ? 'line-clamp-3'
        : '';
  const current = useIsCurrentResult('memo', memo.id);
  return (
    <button
      type="button"
      id={memoElementId(memo.id)}
      draggable={movable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      aria-describedby={movable ? describedBy : undefined}
      aria-keyshortcuts={
        movable ? 'Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown' : undefined
      }
      title={movable ? 'Clic per aprirla, trascinala per cambiarle posto' : 'Clic per aprirla'}
      aria-label={[
        memo.title,
        memo.pinned ? 'in evidenza' : null,
        expanded && memo.body ? markdownToPlainText(memo.body) : null,
        memo.remindOn ? reminderText(memo.remindOn, today, dateFormat) : null,
        memoOwnership(memo, meId, authorName),
      ]
        .filter(Boolean)
        .join('; ')}
      style={surface.style}
      className={`flex w-full cursor-pointer flex-col border text-left text-xs ${
        expanded
          ? `gap-1 px-3 py-2 in-data-compact:px-2 in-data-compact:py-1.5 ${layout === 'grid' ? 'h-full' : ''} ${noteShapeClass(shape, index)}`
          : `gap-0.5 px-2 py-1 shadow-2xs in-data-compact:px-1.5 in-data-compact:py-0.5 ${
              shape === 'postit'
                ? 'rounded-[3px]'
                : shape === 'plain'
                  ? 'rounded-md border-l-4'
                  : 'rounded-lg'
            }`
      } hover:shadow-md ${surface.className} ${movable ? 'active:cursor-grabbing' : ''} ${
        dragging ? 'opacity-50' : ''
      } ${current ? CURRENT_RESULT : ''}`}
    >
      <span className="flex w-full items-center gap-1.5">
        {memo.pinned && <PinnedMark />}
        {memo.private && <PrivateMark />}
        <MemoDot memo={memo} />
        <span className={expanded ? 'min-w-0 flex-1 wrap-break-word' : 'max-w-72 truncate'}>
          <MemoTitle title={memo.title} />
        </span>
        {memo.remindOn && <ReminderBadge remindOn={memo.remindOn} today={today} />}
      </span>
      {authorName && <MemoAuthorLine name={authorName} />}
      {expanded && memo.body && (
        <span className={`block w-full ${clamp}`}>
          <Markdown text={memo.body} phrasing />
        </span>
      )}
    </button>
  );
}
