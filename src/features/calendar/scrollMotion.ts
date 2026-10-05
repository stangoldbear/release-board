/**
 * The curve of a CSS cubic-bezier() timing function, for motion driven from JavaScript: progress in
 * time (0 to 1) to progress in distance.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (t: number) => ((ax * t + bx) * t + cx) * t;
  const y = (t: number) => ((ay * t + by) * t + cy) * t;
  const slope = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  // The curve's parameter for a point in time: Newton's method, then bisection if it stalls.
  const solve = (time: number) => {
    let t = time;
    for (let step = 0; step < 8; step += 1) {
      const error = x(t) - time;
      if (Math.abs(error) < 1e-6) return t;
      const d = slope(t);
      if (Math.abs(d) < 1e-6) break;
      t -= error / d;
    }
    let low = 0;
    let high = 1;
    t = time;
    while (high - low > 1e-7) {
      if (x(t) < time) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return t;
  };

  return (time: number) => (time <= 0 ? 0 : time >= 1 ? 1 : y(solve(time)));
}

/** Strong ease-in-out, for content that moves on screen. */
export const easeInOut = cubicBezier(0.77, 0, 0.175, 1);

/** How long a scroll to a day takes: UI motion stays under 300 ms. */
export const SCROLL_DURATION_MS = 250;

/**
 * Where a scroll animation starts. A far target is approached from one screen away, in the
 * direction of travel, so the animation stays short and still shows which way the calendar moved.
 */
export function scrollStart(from: number, target: number, viewport: number): number {
  return Math.abs(target - from) > 2 * viewport
    ? target - Math.sign(target - from) * viewport
    : from;
}
