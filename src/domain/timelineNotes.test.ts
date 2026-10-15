import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIMELINE_NOTES_LOOK,
  agendaDays,
  laneCount,
  parseTimelineNotesLook,
  placeMarks,
  shownKinds,
  timelineNoteMarks,
} from './timelineNotes';
import type { TimelineNoteMark, TimelineNotesLook } from './timelineNotes';
import type { Memo, Milestone } from './types';

const memo = (id: string, remindOn?: string): Memo => ({
  id,
  title: `Nota ${id}`,
  position: Number(id.replace(/\D/g, '')) || 1,
  ...(remindOn ? { remindOn } : {}),
});

const milestone = (id: string, date: string, title = id): Milestone => ({
  id,
  date,
  title,
  colorId: 'yellow',
});

const sources = {
  dailyNotes: { '2026-10-15': 'Congelamento', '2026-10-20': 'Rilascio 2.8' },
  milestones: [milestone('m2', '2026-10-20', 'Demo'), milestone('m1', '2026-10-27', 'Kick-off')],
  memos: [memo('a1', '2026-10-20'), memo('b2'), memo('c3', '2026-10-20'), memo('d4', '2026-10-10')],
};

const describeMarks = (marks: TimelineNoteMark[]) =>
  marks.map((mark) =>
    mark.kind === 'dayNote'
      ? `${mark.date} flag`
      : mark.kind === 'memos'
        ? `${mark.date} post-it ${mark.memos.map((item) => item.id).join('+')}`
        : `${mark.date} diamond ${mark.milestone.id}`,
  );

const look = (changes: Partial<TimelineNotesLook> = {}): TimelineNotesLook => ({
  ...DEFAULT_TIMELINE_NOTES_LOOK,
  ...changes,
});

describe('timelineNoteMarks', () => {
  it('gathers the notes of the days, the free notes by their reminder and the notes on the timeline', () => {
    expect(describeMarks(timelineNoteMarks(sources, look()))).toEqual([
      '2026-10-10 post-it d4',
      '2026-10-15 flag',
      '2026-10-20 flag',
      '2026-10-20 post-it a1+c3',
      '2026-10-20 diamond m2',
      '2026-10-27 diamond m1',
    ]);
  });

  it('leaves out the hidden kinds and the days outside the range', () => {
    const hidden = look({
      kinds: { ...DEFAULT_TIMELINE_NOTES_LOOK.kinds, memos: { show: 'hidden', color: 'own' } },
    });
    expect(describeMarks(timelineNoteMarks(sources, hidden, '2026-10-16', '2026-10-26'))).toEqual([
      '2026-10-20 flag',
      '2026-10-20 diamond m2',
    ]);
  });
});

describe('placeMarks', () => {
  it('puts the marks of a day side by side on one line', () => {
    const placed = placeMarks(timelineNoteMarks(sources, look()), look());
    const day = placed.filter((item) => item.mark.date === '2026-10-20');
    expect(day.map(({ lane, slot, slots }) => [lane, slot, slots])).toEqual([
      [0, 0, 3],
      [0, 1, 3],
      [0, 2, 3],
    ]);
    expect(laneCount(look())).toBe(1);
  });

  it('gives each kind shown a lane of its own', () => {
    const lanes = look({
      layout: 'lanes',
      kinds: { ...DEFAULT_TIMELINE_NOTES_LOOK.kinds, dayNote: { show: 'hidden', color: 'amber' } },
    });
    const placed = placeMarks(timelineNoteMarks(sources, lanes), lanes);
    const day = placed.filter((item) => item.mark.date === '2026-10-20');
    expect(day.map(({ mark, lane, slot, slots }) => [mark.kind, lane, slot, slots])).toEqual([
      ['memos', 0, 0, 1],
      ['milestone', 1, 0, 1],
    ]);
    expect(laneCount(lanes)).toBe(2);
    expect(shownKinds(lanes)).toEqual(['memos', 'milestone']);
  });
});

describe('agendaDays', () => {
  it('starts with the past reminders, then the days from today with their notes', () => {
    const days = agendaDays(sources, look(), '2026-10-15');
    expect(
      days.map((day) => [day.kind === 'day' ? day.date : 'overdue', describeMarks(day.marks)]),
    ).toEqual([
      ['overdue', ['2026-10-10 post-it d4']],
      ['2026-10-15', ['2026-10-15 flag']],
      ['2026-10-20', ['2026-10-20 flag', '2026-10-20 post-it a1+c3', '2026-10-20 diamond m2']],
      ['2026-10-27', ['2026-10-27 diamond m1']],
    ]);
  });

  it('looks ahead sixty days only', () => {
    const far = { ...sources, milestones: [milestone('m9', '2026-12-31')] };
    expect(
      agendaDays(far, look(), '2026-10-15').some(
        (day) => day.kind === 'day' && day.date === '2026-12-31',
      ),
    ).toBe(false);
  });
});

describe('parseTimelineNotesLook', () => {
  it('keeps what it knows and gives the default to the rest', () => {
    expect(
      parseTimelineNotesLook({
        layout: 'lanes',
        kinds: {
          dayNote: { show: 'title', color: 'own' },
          memos: { show: 'nowhere', color: 'teal' },
        },
      }),
    ).toEqual({
      layout: 'lanes',
      kinds: {
        // The notes of the days have no color of their own: the default stays.
        dayNote: { show: 'title', color: 'amber' },
        memos: { show: 'symbol', color: 'teal' },
        milestone: { show: 'title', color: 'own' },
      },
    });
    expect(parseTimelineNotesLook('lanes')).toBeNull();
    expect(parseTimelineNotesLook({})).toEqual(DEFAULT_TIMELINE_NOTES_LOOK);
  });
});
