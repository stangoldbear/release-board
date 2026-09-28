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
