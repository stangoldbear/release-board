import { describe, expect, it } from 'vitest';
import { keepInView, placeBeside, placePopup } from './popup';

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

describe('a panel moved by hand', () => {
  it('stays where it is put inside the window', () => {
    expect(keepInView({ top: 100, left: 300 }, panel, viewport)).toEqual({ top: 100, left: 300 });
  });

  it('stays clear of the edges of the window', () => {
    expect(keepInView({ top: -50, left: -20 }, panel, viewport)).toEqual({ top: 8, left: 8 });
    expect(keepInView({ top: 590, left: 990 }, panel, viewport)).toEqual({ top: 492, left: 792 });
  });

  it('keeps its bar in view when it is bigger than the window', () => {
    const big = { width: 1200, height: 900 };
    expect(keepInView({ top: 200, left: 200 }, big, viewport)).toEqual({ top: 8, left: 8 });
  });
});

describe('a small window opened from a control', () => {
  const trigger = { top: 300, left: 250, width: 20, height: 20 };

  it('goes on the right of the control, its top near the control', () => {
    expect(placeBeside(trigger, panel, viewport)).toEqual({ top: 292, left: 278 });
  });

  it('goes on the left when the right has no room', () => {
    const near = { ...trigger, left: 900 };
    expect(placeBeside(near, panel, viewport)).toEqual({ top: 292, left: 692 });
  });

  it('stays in the window when it is taller than the room under the control', () => {
    const tall = { width: 200, height: 500 };
    expect(placeBeside(trigger, tall, viewport)).toEqual({ top: 92, left: 278 });
  });

  it('goes under the control when the window is too narrow for either side', () => {
    const phone = { width: 390, height: 664 };
    const wide = { width: 320, height: 200 };
    expect(placeBeside({ top: 300, left: 180, width: 20, height: 20 }, wide, phone)).toEqual({
      top: 324,
      left: 8,
    });
  });
});
