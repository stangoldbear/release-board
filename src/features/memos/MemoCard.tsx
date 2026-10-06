import type { DragEvent, KeyboardEvent } from 'react';
import type { Memo } from '../../domain/types';
import { CURRENT_RESULT, Highlight, useIsCurrentResult } from '../../shared/ui/Highlight';
import {
  MemoAuthorLine,
  MemoDot,
  MemoTitle,
  PrivateMark,
  ReminderBadge,
  memoOwnership,
  memoSurface,
  reminderText,
} from './memoUi';

/** The element of a note, to give it the focus. */
export function memoElementId(memoId: string): string {
  return `memo-${memoId}`;
}

interface MemoCardProps {
  memo: Memo;
  /** With its text, rather than the title alone on one line. */
  expanded: boolean;
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
  const surface = memoSurface(memo);
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
        expanded && memo.body ? memo.body : null,
        memo.remindOn ? reminderText(memo.remindOn, today) : null,
        memoOwnership(memo, meId, authorName),
      ]
        .filter(Boolean)
        .join('; ')}
      style={surface.style}
      className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-lg border px-2 py-1 text-left text-xs shadow-2xs hover:shadow-md in-data-compact:px-1.5 in-data-compact:py-0.5 ${
        surface.className
      } ${movable ? 'active:cursor-grabbing' : ''} ${dragging ? 'opacity-50' : ''} ${
        current ? CURRENT_RESULT : ''
      }`}
    >
      <span className="flex w-full items-center gap-1.5">
        {memo.private && <PrivateMark />}
        <MemoDot memo={memo} />
        <span className={expanded ? 'min-w-0 flex-1 wrap-break-word' : 'max-w-72 truncate'}>
          <MemoTitle title={memo.title} />
        </span>
        {memo.remindOn && <ReminderBadge remindOn={memo.remindOn} today={today} />}
      </span>
      {authorName && <MemoAuthorLine name={authorName} />}
      {expanded && memo.body && (
        <span className="whitespace-pre-line wrap-break-word">
          <Highlight text={memo.body} />
        </span>
      )}
    </button>
  );
}
