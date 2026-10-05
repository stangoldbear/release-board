const ITALIAN_THOUSANDS = /^-?\d{1,3}(\.\d{3})+$/;

/**
 * Reads a number written the Italian way ("1.234.567", "1.234,5", "€ 12") or the English way
 * ("1,234.5"). Returns null when the text is not a number.
 */
export function parseLocaleNumber(text: string): number | null {
  const compact = text.replace(/[\s€$%]/g, '');
  if (!/^-?[\d.,]*\d[\d.,]*$/.test(compact)) return null;

  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  let normalized: string;

  if (lastComma !== -1 && lastDot !== -1) {
    // Both separators: the last one is the decimal separator.
    normalized =
      lastComma > lastDot
        ? compact.replace(/\./g, '').replace(',', '.')
        : compact.replace(/,/g, '');
  } else if (lastComma !== -1) {
    // Only commas: one comma is a decimal separator, several are thousands separators.
    normalized =
      compact.indexOf(',') === lastComma ? compact.replace(',', '.') : compact.replace(/,/g, '');
  } else if (lastDot !== -1) {
    // Only dots: groups of three digits are Italian thousands, anything else is a decimal point.
    normalized = ITALIAN_THOUSANDS.test(compact) ? compact.replace(/\./g, '') : compact;
  } else {
    normalized = compact;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Formats a number the Italian way, e.g. 1234567 → "1.234.567". */
export function formatLocaleNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

const oneDecimal = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
const noDecimals = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });

/**
 * Abbreviations of a number, from the longest. The unit is chosen on the rounded value, so that
 * 999.700 is "1 Mln" rather than "1000K".
 */
function abbreviations(value: number): string[] {
  const size = Math.abs(value);
  if (size >= 999_500_000) {
    const billions = value / 1e9;
    return [`${oneDecimal.format(billions)}\u00a0Mrd`, `${noDecimals.format(billions)}\u00a0Mrd`];
  }
  if (size >= 999_500) {
    const millions = value / 1e6;
    return [
      `${oneDecimal.format(millions)}\u00a0Mln`,
      `${oneDecimal.format(millions)}M`,
      `${noDecimals.format(millions)}M`,
    ];
  }
  if (size >= 1e3) {
    const thousands = value / 1e3;
    return [`${(size < 1e4 ? oneDecimal : noDecimals).format(thousands)}K`];
  }
  return [];
}

/**
 * The number in full when it fits in `maxLength` characters, otherwise the longest abbreviation
 * that fits, or the shortest one: 1234567 → "1,2 Mln", "1,2M" or "1M"; 125000 → "125K". For
 * narrow cells, next to a card with the full value. The abbreviations are written here rather
 * than by Intl, whose compact notation changes with the browser ("1,2 Mio" or "1,2 Mln", "125K"
 * or nothing for thousands).
 */
export function formatShortNumber(value: number, decimals: number, maxLength: number): string {
  const full = formatLocaleNumber(value, decimals);
  if (full.length <= maxLength) return full;
  const shorter = abbreviations(value).filter((text) => text.length < full.length);
  return shorter.find((text) => text.length <= maxLength) ?? shorter.at(-1) ?? full;
}
