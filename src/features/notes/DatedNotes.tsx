import { useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { TaskColorId } from '../../domain/colors';
import type { NotesTop } from '../../domain/notesLook';
import {
  AGENDA_DAYS,
  agendaDays,
  laneCount,
  placeMarks,
  shownKinds,
  timelineNoteMarks,
} from '../../domain/timelineNotes';
import type { TimelineNoteMark, TimelineNotesLook } from '../../domain/timelineNotes';
import type { DailyNotes, Memo, Milestone } from '../../domain/types';
import { useFormatDate } from '../../shared/dateFormat';
import { Highlight } from '../../shared/ui/Highlight';
import { ITALIAN_MONTHS, addDaysIso, parseISODate } from '../../utils/dateUtils';
import { dayName } from '../calendar/timelineLayout';
import { NoteMarks } from './NoteMarks';
import type { NoteMarkActions } from './NoteMarks';
import { DiamondSymbol, FlagSymbol, PostitSymbol } from './noteSymbols';
import { markdownToPlainText } from '../../utils/markdown';

/** The days of the small timeline, from today. */
export const MINI_TIMELINE_DAYS = 42;
/** The width of a day of the small timeline: the least target of WCAG 2.2. */
const MINI_DAY_WIDTH = 24;
/** The height of a line of the small timeline. */
const MINI_LANE = 26;

interface DatedNotesProps {
  view: NotesTop;
  /** The notes of the days, the free notes the user sees and the notes on the timeline of no project. */
  sources: { dailyNotes: DailyNotes; memos: readonly Memo[]; milestones: readonly Milestone[] };
  look: TimelineNotesLook;
  /** The color of the free notes without one, as the board shows them. */
  paperColor: TaskColorId | undefined;
  actions: NoteMarkActions;
  today: string;
}

/** One line of a day of the agenda: a note, with its symbol, that opens on a click. */
interface AgendaLine {
  key: string;
  symbol: ReactNode;
  title: string;
  label: string;
  open: () => void;
}

/**
 * The notes that have a day, over the board of Notes, with the symbols of the row «Note sulla
 * timeline» and as its look shows them: an agenda of the days ahead, with the reminders already
 * past first, or six weeks drawn as a small timeline. A note opens where it lives.
 */
export function DatedNotes({ view, sources, look, paperColor, actions, today }: DatedNotesProps) {
  const titleId = useId();
  const heading = (
    // On the surface of the page, as every text of the board: the board's own color may be dark.
    <h3
      id={titleId}
      className="flex w-fit items-center gap-1.5 rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs font-bold text-fg shadow-2xs"
    >
      <DiamondSymbol colorId={undefined} size={12} />
      Note sulla timeline
      <span className="font-normal">
        · {view === 'agenda' ? `prossimi ${AGENDA_DAYS} giorni` : 'sei settimane'}
      </span>
    </h3>
  );
  if (shownKinds(look).length === 0) return null;
  return (
    <section aria-labelledby={titleId} className="space-y-1.5">
      {heading}
      {view === 'agenda' ? (
        <Agenda
          sources={sources}
          look={look}
          paperColor={paperColor}
          actions={actions}
          today={today}
        />
      ) : (
        <MiniTimeline
          sources={sources}
          look={look}
          paperColor={paperColor}
          actions={actions}
          today={today}
        />
      )}
    </section>
  );
}

type PartProps = Omit<DatedNotesProps, 'view'>;

function Agenda({ sources, look, paperColor, actions, today }: PartProps) {
  const formatDate = useFormatDate();
  const days = agendaDays(sources, look, today);
  const tomorrow = addDaysIso(today, 1);
  const colorOf = (kind: 'memos' | 'milestone', own: TaskColorId | undefined) => {
    const color = look.kinds[kind].color;
    return color === 'own' ? own : color;
  };
  const linesOf = (mark: TimelineNoteMark): AgendaLine[] => {
    const day = formatDate(mark.date);
    if (mark.kind === 'dayNote') {
      return [
        {
          key: `day-${mark.date}`,
          symbol: <FlagSymbol colorId={look.kinds.dayNote.color as TaskColorId} size={14} />,
          title: markdownToPlainText(mark.text),
          label: `Nota del giorno di Next Releases, ${day}: ${markdownToPlainText(mark.text)}`,
          open: () => actions.onOpenDayNote(mark.date),
        },
      ];
    }
    if (mark.kind === 'milestone') {
      return [
        {
          key: `milestone-${mark.milestone.id}`,
          symbol: (
            <DiamondSymbol colorId={colorOf('milestone', mark.milestone.colorId)} size={12} />
          ),
          title: mark.milestone.title,
          label: `Nota sulla timeline «${mark.milestone.title}», ${day}`,
          open: () => actions.onOpenMilestone(mark.milestone),
        },
      ];
    }
    return mark.memos.map((memo) => ({
      key: `memo-${memo.id}`,
      symbol: <PostitSymbol colorIds={[colorOf('memos', memo.colorId ?? paperColor)]} size={14} />,
      title: memo.title,
      label: `Nota di Notes con promemoria ${day}: «${memo.title}»`,
      open: () => actions.onOpenMemo(memo),
    }));
  };

  if (days.length === 0) {
    return (
      <p className="rounded-lg bg-surface px-2 py-1.5 text-xs text-fg-muted">
        Nessuna nota con un giorno nei prossimi {AGENDA_DAYS} giorni.
      </p>
    );
  }
  return (
    <ul className="flex gap-2 overflow-x-auto pb-1">
      {days.map((day) => {
        const lines = day.marks.flatMap(linesOf);
        const label =
          day.kind === 'overdue'
            ? 'Promemoria passati'
            : day.date === today
              ? 'Oggi'
              : day.date === tomorrow
                ? 'Domani'
                : dayName(day.date);
        return (
          <li
            key={day.kind === 'overdue' ? 'overdue' : day.date}
            aria-label={`${label}: ${lines.length === 1 ? '1 nota' : `${lines.length} note`}`}
            className="flex w-48 shrink-0 flex-col gap-0.5 rounded-lg border border-line bg-surface p-1.5 text-xs text-fg shadow-2xs"
          >
            <p
              className={`flex justify-between gap-2 px-1 font-bold ${
                day.kind === 'overdue'
                  ? 'text-warning'
                  : day.date === today
                    ? 'text-link'
                    : 'text-fg-muted'
              }`}
            >
              <span className="first-letter:uppercase">{label}</span>
              <span aria-hidden="true" className="tabular-nums">
                {lines.length}
              </span>
            </p>
            <ul className="space-y-px">
              {lines.map((line) => (
                <li key={line.key}>
                  <button
                    type="button"
                    aria-label={line.label}
                    title={line.title}
                    onClick={line.open}
                    className="flex min-h-6 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded px-1 text-left hover:bg-surface-strong"
                  >
                    {line.symbol}
                    <span className="truncate">
                      <Highlight text={line.title.replace(/\s+/g, ' ')} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

function MiniTimeline({ sources, look, paperColor, actions, today }: PartProps) {
  const range = useMemo(
    () => ({ start: today, end: addDaysIso(today, MINI_TIMELINE_DAYS - 1) }),
    [today],
  );
  const { dailyNotes, memos, milestones } = sources;
  const placed = useMemo(
    () =>
      placeMarks(
        timelineNoteMarks({ dailyNotes, memos, milestones }, look, range.start, range.end),
        look,
      ),
    [dailyNotes, memos, milestones, look, range.start, range.end],
  );
  const days = Array.from({ length: MINI_TIMELINE_DAYS }, (_, index) => addDaysIso(today, index));
  const lanes = look.layout === 'lanes';
  const height = lanes ? laneCount(look) * MINI_LANE + 8 : MINI_LANE + 12;
  const laneTop = (lane: number) => (lanes ? `${6 + (lane + 0.5) * MINI_LANE}px` : '55%');

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface text-fg">
      <div style={{ width: MINI_TIMELINE_DAYS * MINI_DAY_WIDTH }}>
        {/* The months and the days: numbers, the weekends shaded. */}
        <div aria-hidden="true" className="flex border-b border-line text-xs">
          {days.map((day, index) => {
            const date = parseISODate(day);
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            const month = index === 0 || date.getDate() === 1;
            return (
              <div
                key={day}
                className={`relative shrink-0 pt-4 pb-0.5 text-center tabular-nums ${
                  weekend ? 'bg-surface-muted text-fg-muted' : ''
                } ${day === today ? 'font-bold text-link' : ''}`}
                style={{ width: MINI_DAY_WIDTH }}
              >
                {month && (
                  <span className="absolute top-0 left-1 text-xs font-semibold whitespace-nowrap text-fg">
                    {ITALIAN_MONTHS[date.getMonth()]}
                  </span>
                )}
                {date.getDate()}
              </div>
            );
          })}
        </div>
        <div className="relative flex" style={{ height }}>
          {days.map((day) => {
            const weekday = parseISODate(day).getDay();
            return (
              <div
                key={day}
                aria-hidden="true"
                className={`shrink-0 border-l border-line ${
                  weekday === 0 || weekday === 6 ? 'bg-surface-muted' : ''
                }`}
                style={{ width: MINI_DAY_WIDTH }}
              />
            );
          })}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-link"
            style={{ left: MINI_DAY_WIDTH / 2 }}
          />
          <div className="pointer-events-none absolute inset-0">
            <NoteMarks
              placed={placed}
              range={range}
              dayWidth={MINI_DAY_WIDTH}
              look={look}
              laneTop={laneTop}
              paperColor={paperColor}
              actions={actions}
              // The days are narrow: the titles are in the cards and in the names.
              titles={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
