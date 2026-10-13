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

/** A color in OKLCH: lightness from 0 to 1, chroma from 0 (gray) up, hue in degrees. */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

const toLinear = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (value: number) =>
  255 * (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055);

/** OKLab of a color, by Björn Ottosson's formulas. */
function toOklab(hex: string): Rgb {
  const [r, g, b] = parse(hex).map(toLinear) as Rgb;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Linear sRGB of an OKLab color; channels outside 0–1 are out of the gamut. */
function oklabToLinear([lightness, a, b]: Rgb): Rgb {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function toOklch(hex: string): Oklch {
  const [l, a, b] = toOklab(hex);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l, c: Math.hypot(a, b), h: h < 0 ? h + 360 : h };
}

/**
 * The #RRGGBB of an OKLCH color. A chroma the screen cannot show is lowered, at the same
 * lightness and hue, until it can.
 */
export function fromOklch({ l, c, h }: Oklch): string {
  const angle = (h * Math.PI) / 180;
  const linear = (chroma: number) =>
    oklabToLinear([l, chroma * Math.cos(angle), chroma * Math.sin(angle)]);
  const inGamut = (rgb: Rgb) => rgb.every((value) => value >= -0.0001 && value <= 1.0001);
  let chroma = c;
  if (!inGamut(linear(chroma))) {
    let low = 0;
    let high = c;
    for (let step = 0; step < 20; step += 1) {
      const middle = (low + high) / 2;
      if (inGamut(linear(middle))) low = middle;
      else high = middle;
    }
    chroma = low;
  }
  return format(linear(chroma).map((value) => fromLinear(Math.min(1, Math.max(0, value)))) as Rgb);
}

/** How far apart two colors look: Euclidean distance in OKLab, times 100. */
export function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = toOklab(a);
  const [l2, a2, b2] = toOklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100;
}
