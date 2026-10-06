import { describe, expect, it } from 'vitest';
import {
  calendarViewReducer,
  initialRange,
  initialView,
  isNearEnd,
  periodLabel,
} from './calendarView';
import type { CalendarView } from './calendarView';

// Monday 5 October 2026.
const today = '2026-10-05';
const opened: CalendarView = initialView('month', today);

describe('initialView', () => {
  it('opens the timeline on today, holding three months before it and six after', () => {
    expect(opened).toMatchObject({ mode: 'timeline', anchor: today, jump: { date: today, id: 0 } });
    // From the Monday of the week of 1 July to the Sunday of the week of 30 April.
    expect(initialRange(today)).toEqual({ start: '2026-06-29', end: '2027-05-02' });
  });
});

describe('calendarViewReducer', () => {
  it('goes to the first day of the next and previous month, from the month in view', () => {
    const scrolled = calendarViewReducer(opened, {
      type: 'scrolled',
      first: '2026-10-20',
      last: '2026-11-15',
      settled: true,
    });
    const next = calendarViewReducer(scrolled, { type: 'next' });
    expect(next.anchor).toBe('2026-11-01');
    expect(next.jump).toEqual({ date: '2026-11-01', id: 1 });
    expect(calendarViewReducer(scrolled, { type: 'previous' }).jump.date).toBe('2026-09-01');
  });

  it('pages by a week on the board', () => {
    const week = calendarViewReducer(opened, { type: 'setMode', mode: 'week' });
    const next = calendarViewReducer(week, { type: 'next' });
    expect(next.anchor).toBe('2026-10-12');
    expect(next.jump).toBe(week.jump);
  });

  it('jumps again to the same day, so that "today" always scrolls back to it', () => {
    const first = calendarViewReducer(opened, { type: 'goTo', date: today });
    const second = calendarViewReducer(first, { type: 'goTo', date: today });
    expect(second.jump).toEqual({ date: today, id: 2 });
  });

  it('grows the timeline so that a far day can be shown with months after it', () => {
    const far = calendarViewReducer(opened, { type: 'goTo', date: '2028-01-15' });
    expect(far.range).toEqual({ start: '2026-06-29', end: '2028-08-06' });
    const past = calendarViewReducer(opened, { type: 'goTo', date: '2025-12-10' });
    expect(past.range.start).toBe('2025-12-01');
    expect(past.range.end).toBe(opened.range.end);
  });

  it('shows the days of a week from the quarter view, zoomed in', () => {
    const quarter = { ...opened, zoom: 'quarter' as const };
    const days = calendarViewReducer(quarter, { type: 'goTo', date: '2026-11-09', zoom: 'detail' });
    expect(days).toMatchObject({ zoom: 'detail', anchor: '2026-11-09', jump: { id: 1 } });
  });

  it('remembers the first day in view, and grows near either end', () => {
    const middle = calendarViewReducer(opened, {
      type: 'scrolled',
      first: '2026-11-02',
      last: '2026-11-28',
      settled: true,
    });
    expect(middle.anchor).toBe('2026-11-02');
    expect(middle.range).toBe(opened.range);

    const end = calendarViewReducer(opened, {
      type: 'scrolled',
      first: '2027-03-01',
      last: '2027-04-01',
      settled: false,
    });
    expect(end.range).toEqual({ start: '2026-06-29', end: '2027-09-05' });
    expect(isNearEnd(opened.range, '2027-04-01')).toBe(true);
  });

  it('grows at the start only once scrolling has stopped', () => {
    const scroll = { type: 'scrolled' as const, first: '2026-07-01', last: '2026-07-28' };
    expect(calendarViewReducer(opened, { ...scroll, settled: false }).range).toBe(opened.range);
    expect(calendarViewReducer(opened, { ...scroll, settled: true }).range.start).toBe(
      '2026-02-23',
    );
  });

  it('returns the same view when nothing changes', () => {
    const report = { type: 'scrolled' as const, first: today, last: '2026-10-30', settled: true };
    expect(calendarViewReducer(opened, report)).toBe(opened);
    expect(calendarViewReducer(opened, { type: 'setMode', mode: 'timeline' })).toBe(opened);
  });

  it('opens the timeline on the week of the board', () => {
    const week = calendarViewReducer(
      { ...opened, mode: 'week', anchor: '2026-12-02' },
      { type: 'setMode', mode: 'timeline' },
    );
    expect(week).toMatchObject({ mode: 'timeline', jump: { date: '2026-12-02', id: 1 } });
    expect(
      calendarViewReducer({ ...opened, mode: 'week' }, { type: 'setZoom', zoom: 'quarter' }),
    ).toMatchObject({ mode: 'timeline', zoom: 'quarter', jump: { id: 1 } });
  });

  it('keeps the place when zooming, and stops at the closest and the widest zoom', () => {
    const detail = calendarViewReducer(opened, { type: 'zoomBy', step: -1 });
    expect(detail).toEqual({ ...opened, zoom: 'detail' });
    expect(calendarViewReducer(detail, { type: 'zoomBy', step: -1 })).toBe(detail);
    // Out from a month: two months, then the quarter.
    const bimester = calendarViewReducer(opened, { type: 'zoomBy', step: 1 });
    expect(bimester).toEqual({ ...opened, zoom: 'bimester' });
    expect(calendarViewReducer(bimester, { type: 'zoomBy', step: 1 })).toEqual({
      ...opened,
      zoom: 'quarter',
    });
    const quarter = { ...opened, zoom: 'quarter' as const };
    expect(calendarViewReducer(quarter, { type: 'zoomBy', step: 1 })).toBe(quarter);
  });
});

describe('periodLabel', () => {
  it('names the month in view, or the week of the board', () => {
    expect(periodLabel({ ...opened, anchor: '2026-09-29' })).toBe('Settembre 2026');
    expect(periodLabel({ ...opened, mode: 'week', anchor: '2026-09-29' })).toBe(
      '28 set – 4 ott 2026',
    );
    expect(periodLabel({ ...opened, mode: 'week', anchor: '2026-12-30' })).toBe(
      '28 dic 2026 – 3 gen 2027',
    );
  });
});
