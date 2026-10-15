import type { ReactNode } from 'react';
import type { TaskColorId } from '../../domain/colors';
import type { DateRange } from '../../domain/schedule';
import { markCount } from '../../domain/timelineNotes';
import type { PlacedMark, TimelineNoteMark, TimelineNotesLook } from '../../domain/timelineNotes';
import type { Memo, Milestone } from '../../domain/types';
import { useFormatDate } from '../../shared/dateFormat';
import { Highlight } from '../../shared/ui/Highlight';
import { HoverCard, useHoverCard } from '../../shared/ui/HoverCard';
import { Menu } from '../../shared/ui/Menu';
import { diffDays } from '../../utils/dateUtils';
import { MilestoneDiamond } from '../roadmaps/MilestoneDiamond';
import type { MilestoneTools } from '../roadmaps/MilestoneDiamond';
import { MIN_TITLE_ROOM, titleRooms } from './markLayout';
import { DiamondSymbol, FlagSymbol, PostitSymbol } from './noteSymbols';

/** How far apart the marks of a day sit on their line. */
export const MARK_SLOT = 22;
/** The side of a symbol: its middle is on its place in the day. */
const SYMBOL = 16;

/** The widest a title gets, even with room. */
const TITLE_MAX = 192;
/** The room between a symbol and its title, and before the next symbol. */
const TITLE_GAP = 3;
const TITLE_CHIP =
  'truncate rounded-sm border border-line bg-surface px-1 text-xs font-semibold whitespace-nowrap text-fg';
// The symbol is 16 pixels; the area of the click reaches 24 around it, the least target of WCAG 2.2.
const MARK_BUTTON =
  "pointer-events-auto absolute z-[450] flex -translate-y-1/2 cursor-pointer items-center gap-1 rounded-sm text-left before:absolute before:-inset-1 before:content-[''] hover:z-[600] focus-visible:z-[600]";

/** What a click on a mark opens: the window of its note, wherever the note lives. */
export interface NoteMarkActions {
  onOpenDayNote: (date: string) => void;
  onOpenMemo: (memo: Memo) => void;
  onOpenMilestone: (milestone: Milestone) => void;
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** The color a free note shows: its own or the kind's, and the paper of Notes when it has none. */
function memoColor(
  memo: Memo,
  look: TimelineNotesLook,
  paperColor: TaskColorId | undefined,
): TaskColorId | undefined {
  const color = look.kinds.memos.color;
  return color === 'own' ? (memo.colorId ?? paperColor) : color;
}

/** The text of a mark in the card that opens on it. */
function MarkDetails({
  mark,
  look,
  paperColor,
}: {
  mark: TimelineNoteMark;
  look: TimelineNotesLook;
  paperColor: TaskColorId | undefined;
}) {
  const formatDate = useFormatDate();
  const heading = (symbol: ReactNode, what: string) => (
    <p className="flex items-center gap-2 text-xs text-fg-muted">
      {symbol}
      <span>
        {what} · {formatDate(mark.date)}
      </span>
    </p>
  );
  if (mark.kind === 'dayNote') {
    return (
      <div className="space-y-1.5 text-sm">
        {heading(
          <FlagSymbol colorId={look.kinds.dayNote.color as TaskColorId} size={14} />,
          'Nota del giorno di Next Releases',
        )}
        <p className="break-words whitespace-pre-line">{mark.text}</p>
      </div>
    );
  }
  if (mark.kind === 'memos') {
    return (
      <div className="space-y-1.5 text-sm">
        {heading(
          <PostitSymbol
            colorIds={mark.memos.map((memo) => memoColor(memo, look, paperColor))}
            size={14}
          />,
          mark.memos.length === 1
            ? 'Promemoria di Notes'
            : `${mark.memos.length} promemoria di Notes`,
        )}
        <ul className="space-y-0.5">
          {mark.memos.map((memo) => (
            <li key={memo.id} className="break-words">
              {memo.title}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="space-y-1.5 text-sm">
      {heading(<DiamondSymbol colorId={mark.milestone.colorId} size={12} />, 'Nota sulla timeline')}
      <p className="font-bold break-words">{mark.milestone.title}</p>
      {mark.milestone.body && (
        <p className="break-words whitespace-pre-line">{mark.milestone.body}</p>
      )}
    </div>
  );
}

interface NoteMarksProps {
  placed: readonly PlacedMark[];
  /** The days drawn: the marks are placed from the first. */
  range: DateRange;
  dayWidth: number;
  look: TimelineNotesLook;
  /** The vertical middle of a lane, as a CSS length. */
  laneTop: (lane: number) => string;
  /** The color of the free notes without one: yellow as the post-its of Notes, or the page's. */
  paperColor: TaskColorId | undefined;
  actions: NoteMarkActions;
  /** On the timeline the diamonds also move by dragging and with the arrows; elsewhere they open. */
  milestoneTools?: MilestoneTools;
  /** The titles beside the symbols, when the look asks for them; off where the days are too narrow. */
  titles?: boolean;
}

/**
 * The marks of the notes that have a day, over the days of a row: a flag for the note of a day of
 * Next Releases, a post-it or a pile for the free notes of Notes, a diamond for a note on the
 * timeline, each with its title on its right when the look asks for it. Resting on a mark or
 * focusing it shows its note; a click opens it, and a pile first lists its notes.
 */
export function NoteMarks({
  placed,
  range,
  dayWidth,
  look,
  laneTop,
  paperColor,
  actions,
  milestoneTools,
  titles = true,
}: NoteMarksProps) {
  const formatDate = useFormatDate();
  const card = useHoverCard<TimelineNoteMark>();
  const offsets = placed.map(({ slot, slots }) => (slot - (slots - 1) / 2) * MARK_SLOT);
  const middles = placed.map(
    ({ mark }, index) =>
      (diffDays(range.start, mark.date) + 0.5) * dayWidth + (offsets[index] ?? 0),
  );
  const rooms = titleRooms(
    placed.map(({ lane }, index) => ({ x: middles[index] ?? 0, lane })),
    SYMBOL,
    TITLE_GAP,
  );

  return (
    <>
      {placed.map(({ mark, lane }, index) => {
        const offset = offsets[index] ?? 0;
        const middle = middles[index] ?? 0;
        const top = laneTop(lane);
        // A title stops before the next symbol of its lane; without room, the symbol shows alone.
        const room = Math.min(rooms[index] ?? Infinity, TITLE_MAX);
        const showTitle =
          titles && look.kinds[mark.kind].show === 'title' && room >= MIN_TITLE_ROOM;
        const titleStyle = { maxWidth: room };
        if (mark.kind === 'milestone' && milestoneTools) {
          return (
            <MilestoneDiamond
              key={`milestone-${mark.milestone.id}`}
              milestone={mark.milestone}
              range={range}
              dayWidth={dayWidth}
              top={top}
              tools={milestoneTools}
              offset={offset}
              showTitle={showTitle}
              titleWidth={room}
              colorId={
                look.kinds.milestone.color === 'own' ? undefined : look.kinds.milestone.color
              }
            />
          );
        }
        const { onPointerEnter, onPointerLeave, onFocus, onBlur } = card.triggerProps(mark);
        const hover = { onPointerEnter, onPointerLeave, onFocus, onBlur };
        const style = { left: middle - SYMBOL / 2, top };
        const day = formatDate(mark.date);
        if (mark.kind === 'dayNote') {
          return (
            <button
              key={`day-${mark.date}`}
              type="button"
              aria-label={`Nota del giorno di Next Releases, ${day}: ${oneLine(mark.text)}`}
              onClick={() => actions.onOpenDayNote(mark.date)}
              {...hover}
              style={style}
              className={MARK_BUTTON}
            >
              <FlagSymbol colorId={look.kinds.dayNote.color as TaskColorId} size={SYMBOL} />
              {showTitle && (
                <span className={TITLE_CHIP} style={titleStyle}>
                  <Highlight text={oneLine(mark.text)} />
                </span>
              )}
            </button>
          );
        }
        if (mark.kind === 'milestone') {
          return (
            <button
              key={`milestone-${mark.milestone.id}`}
              type="button"
              aria-label={`Nota sulla timeline «${mark.milestone.title}», ${day}`}
              onClick={() => actions.onOpenMilestone(mark.milestone)}
              {...hover}
              style={style}
              className={MARK_BUTTON}
            >
              <DiamondSymbol
                colorId={
                  look.kinds.milestone.color === 'own'
                    ? mark.milestone.colorId
                    : look.kinds.milestone.color
                }
                size={SYMBOL - 2}
              />
              {showTitle && (
                <span className={TITLE_CHIP} style={titleStyle}>
                  <Highlight text={mark.milestone.title} />
                </span>
              )}
            </button>
          );
        }
        const count = markCount(mark);
        const [first] = mark.memos;
        const memoTitles = mark.memos.map((memo) => `«${memo.title}»`).join(', ');
        const content = (
          <>
            {/* The number of the notes on the corner of the pile, so that it takes no room. */}
            <span className="relative flex shrink-0">
              <PostitSymbol
                colorIds={mark.memos.map((memo) => memoColor(memo, look, paperColor))}
                size={SYMBOL}
              />
              {count > 1 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-2 -right-2 min-w-3.5 rounded-full bg-fg px-0.5 text-center text-[0.625rem] leading-3.5 font-bold text-canvas tabular-nums"
                >
                  {count}
                </span>
              )}
            </span>
            {showTitle && first && (
              <span className={TITLE_CHIP} style={titleStyle}>
                <Highlight text={first.title} />
                {count > 1 && ` e altre ${count - 1}`}
              </span>
            )}
          </>
        );
        if (count === 1 && first) {
          return (
            <button
              key={`memos-${mark.date}`}
              type="button"
              aria-label={`Nota di Notes con promemoria ${day}: ${memoTitles}`}
              onClick={() => actions.onOpenMemo(first)}
              {...hover}
              style={style}
              className={MARK_BUTTON}
            >
              {content}
            </button>
          );
        }
        return (
          <Menu
            key={`memos-${mark.date}`}
            label={`${count} note di Notes con promemoria ${day}`}
            items={mark.memos.map((memo) => ({
              label: memo.title,
              onSelect: () => actions.onOpenMemo(memo),
            }))}
            variant="ghost"
            size="bare"
            chevron={false}
            aria-label={`${count} note di Notes con promemoria ${day}: ${memoTitles}`}
            {...hover}
            style={style}
            className={`${MARK_BUTTON} font-normal`}
          >
            {content}
          </Menu>
        );
      })}
      {card.card && (
        <HoverCard
          anchor={card.card.anchor}
          cardRef={card.cardProps.cardRef}
          onPointerEnter={card.cardProps.onPointerEnter}
          onPointerLeave={card.cardProps.onPointerLeave}
        >
          <MarkDetails mark={card.card.item} look={look} paperColor={paperColor} />
        </HoverCard>
      )}
    </>
  );
}
