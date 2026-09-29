import { describe, expect, it } from 'vitest';
import { calendarViewReducer, periodLabel, visiblePeriod } from './calendarView';
import type { CalendarView } from './calendarView';

const month: CalendarView = { mode: 'timeline', zoom: 'month', anchor: '2026-09-29' };

describe('calendarViewReducer', () => {
  it('pages by the visible period', () => {
    expect(calendarViewReducer(month, { type: 'next' }).anchor).toBe('2026-10-29');
    expect(calendarViewReducer({ ...month, zoom: 'detail' }, { type: 'previous' }).anchor).toBe(
      '2026-09-15',
    );
    expect(calendarViewReducer({ ...month, zoom: 'quarter' }, { type: 'next' }).anchor).toBe(
      '2026-12-29',
    );
    expect(calendarViewReducer({ ...month, mode: 'week' }, { type: 'next' }).anchor).toBe(
      '2026-10-06',
    );
  });

  it('keeps the anchor when zooming, so that zooming back returns to the same period', () => {
    const detail = calendarViewReducer(month, { type: 'zoomBy', step: -1 });
    expect(detail).toEqual({ ...month, zoom: 'detail' });
    expect(calendarViewReducer(detail, { type: 'zoomBy', step: 1 })).toEqual(month);
  });

  it('stops at the closest and at the widest zoom', () => {
    const detail = { ...month, zoom: 'detail' as const };
    expect(calendarViewReducer(detail, { type: 'zoomBy', step: -1 })).toBe(detail);
    const quarter = { ...month, zoom: 'quarter' as const };
    expect(calendarViewReducer(quarter, { type: 'zoomBy', step: 1 })).toBe(quarter);
  });

  it('goes back to the timeline when a zoom level is chosen', () => {
    const week = { ...month, mode: 'week' as const };
    expect(calendarViewReducer(week, { type: 'setZoom', zoom: 'quarter' })).toEqual({
      ...month,
      zoom: 'quarter',
    });
  });

  it('jumps to a date', () => {
    expect(calendarViewReducer(month, { type: 'goTo', date: '2027-01-10' }).anchor).toBe(
      '2027-01-10',
    );
  });
});

describe('periodLabel', () => {
  it('names the visible period', () => {
    expect(periodLabel(month)).toBe('Settembre 2026');
    expect(periodLabel({ ...month, zoom: 'detail' })).toBe('28 set – 11 ott 2026');
    expect(periodLabel({ ...month, zoom: 'quarter' })).toBe('Settembre – Novembre 2026');
    expect(periodLabel({ ...month, mode: 'week' })).toBe('28 set – 4 ott 2026');
  });

  it('shows both years when the period crosses the new year', () => {
    const december = { ...month, anchor: '2026-12-30' };
    expect(periodLabel({ ...december, zoom: 'detail' })).toBe('28 dic 2026 – 10 gen 2027');
    expect(periodLabel({ ...december, zoom: 'quarter' })).toBe('Dicembre 2026 – Febbraio 2027');
  });
});

describe('visiblePeriod', () => {
  it('shows the week of the anchor on the board, whatever the zoom', () => {
    expect(visiblePeriod({ ...month, mode: 'week', zoom: 'quarter' })).toEqual({
      start: '2026-09-28',
      end: '2026-10-04',
    });
  });
});
