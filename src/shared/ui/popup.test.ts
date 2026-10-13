import { describe, expect, it } from 'vitest';
import { placePopup } from './popup';

const viewport = { width: 1000, height: 600 };
const panel = { width: 200, height: 100 };

describe('the place of a panel next to its trigger', () => {
  it('goes under the trigger, lined up with its left edge', () => {
    const place = placePopup({ top: 50, left: 300, width: 80, height: 30 }, panel, viewport);
    expect(place).toEqual({ top: 84, left: 300, above: false });
  });

  it('lines up with the right edge, or centers, when asked', () => {
    const trigger = { top: 50, left: 300, width: 80, height: 30 };
    expect(placePopup(trigger, panel, viewport, { align: 'end' }).left).toBe(180);
    expect(placePopup(trigger, panel, viewport, { align: 'center' }).left).toBe(240);
  });

  it('goes over the trigger when there is no room under it', () => {
    const place = placePopup({ top: 540, left: 300, width: 80, height: 30 }, panel, viewport);
    expect(place).toEqual({ top: 436, left: 300, above: true });
  });

  it('prefers the top for a tooltip, and flips under when the top has no room', () => {
    const low = placePopup({ top: 300, left: 300, width: 80, height: 30 }, panel, viewport, {
      side: 'top',
    });
    expect(low).toEqual({ top: 196, left: 300, above: true });
    const high = placePopup({ top: 20, left: 300, width: 80, height: 30 }, panel, viewport, {
      side: 'top',
    });
    expect(high).toEqual({ top: 54, left: 300, above: false });
  });

  it('stays inside the window', () => {
    expect(placePopup({ top: 50, left: 950, width: 40, height: 30 }, panel, viewport).left).toBe(
      792,
    );
    expect(
      placePopup({ top: 50, left: 2, width: 40, height: 30 }, panel, viewport, { align: 'end' })
        .left,
    ).toBe(8);
    // Taller than the room on both sides: it stays at the top margin.
    expect(
      placePopup(
        { top: 300, left: 300, width: 80, height: 30 },
        { width: 200, height: 700 },
        viewport,
      ).top,
    ).toBe(8);
  });
});
