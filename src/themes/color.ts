/** Colors as #RRGGBB, the format of the themes, and the arithmetic their contrast needs. */

type Rgb = [number, number, number];

function parse(hex: string): Rgb {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as Rgb;
}

function format(rgb: Rgb): string {
  return `#${rgb
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/** Relative luminance as defined by WCAG 2. */
export function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio as defined by WCAG 2, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** `amount` of `to` over `from`: 0 gives `from`, 1 gives `to`. */
export function mix(from: string, to: string, amount: number): string {
  const a = parse(from);
  const b = parse(to);
  return format(a.map((channel, index) => channel + (b[index]! - channel) * amount) as Rgb);
}

/**
 * The color, moved towards `pole` (black or white) just enough to reach `minimum` contrast with
 * every background; the pole itself when even that is not enough.
 */
export function ensureContrast(
  color: string,
  backgrounds: readonly string[],
  minimum: number,
  pole: string,
): string {
  for (let step = 0; step <= 100; step += 1) {
    const candidate = mix(color, pole, step / 100);
    if (backgrounds.every((background) => contrast(candidate, background) >= minimum)) {
      return candidate;
    }
  }
  return pole;
}
