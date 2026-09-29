export const ITALIAN_MONTHS = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

export const ITALIAN_DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

export const ITALIAN_MONTHS_SHORT = [
  'gen',
  'feb',
  'mar',
  'apr',
  'mag',
  'giu',
  'lug',
  'ago',
  'set',
  'ott',
  'nov',
  'dic',
];

export function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today in the local time zone, as YYYY-MM-DD. */
export function todayIso(): string {
  return formatDateToISO(new Date());
}

export function parseISODate(dateStr: string): Date {
  const [y = 0, m = 1, d = 1] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Computus: Butcher's Gregorian algorithm for Easter calculation
 */
export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Returns the Italian holiday name if the date is an official Italian national holiday, or null
 */
export function getItalianHolidayName(date: Date): string | null {
  const day = date.getDate();
  const month = date.getMonth(); // 0 = Gennaio, 11 = Dicembre
  const year = date.getFullYear();

  // Fixed Italian national holidays
  if (month === 0 && day === 1) return 'Capodanno';
  if (month === 0 && day === 6) return 'Epifania';
  if (month === 3 && day === 25) return 'Festa della Liberazione'; // 25 Aprile
  if (month === 4 && day === 1) return 'Festa del Lavoro'; // 1 Maggio
  if (month === 5 && day === 2) return 'Festa della Repubblica'; // 2 Giugno
  if (month === 7 && day === 15) return 'Ferragosto / Assunzione'; // 15 Agosto
  if (month === 10 && day === 1) return 'Tutti i Santi'; // 1 Novembre
  if (month === 11 && day === 8) return 'Immacolata Concezione'; // 8 Dicembre
  if (month === 11 && day === 25) return 'Natale'; // 25 Dicembre
  if (month === 11 && day === 26) return 'Santo Stefano'; // 26 Dicembre

  // Variable Italian national holidays (Easter & Pasquetta)
  const easter = getEasterSunday(year);
  if (easter.getMonth() === month && easter.getDate() === day) {
    return 'Pasqua';
  }
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  if (easterMonday.getMonth() === month && easterMonday.getDate() === day) {
    return "Lunedì dell'Angelo (Pasquetta)";
  }

  return null;
}

export function isRedDay(
  date: Date,
  highlightWeekends: boolean = true,
): {
  isRed: boolean;
  isHoliday: boolean;
  isWeekend: boolean;
  holidayName: string | null;
} {
  const holidayName = getItalianHolidayName(date);
  const weekend = isWeekend(date);
  const isHoliday = holidayName !== null;
  const isRed = isHoliday || (weekend && highlightWeekends);

  return {
    isRed,
    isHoliday,
    isWeekend: weekend,
    holidayName,
  };
}

export function getDaysInMonth(year: number, monthIndex: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, monthIndex, 1);
  while (date.getMonth() === monthIndex) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Days from one ISO date to another: 0 for the same day, negative when `to` comes first. */
export function diffDays(from: string, to: string): number {
  const diffTime = parseISODate(to).getTime() - parseISODate(from).getTime();
  // Rounded: a day across a daylight saving change lasts 23 or 25 hours.
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/** Number of days from start to end, both included. */
export function daysBetween(startStr: string, endStr: string): number {
  return diffDays(startStr, endStr) + 1;
}

/** The ISO date `days` days after `iso`, or before it when negative. */
export function addDaysIso(iso: string, days: number): string {
  return formatDateToISO(addDays(parseISODate(iso), days));
}

/** The same day `months` months later, or earlier, kept inside the target month: 31/01 + 1 → 28/02. */
export function addMonthsIso(iso: string, months: number): string {
  const date = parseISODate(iso);
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return formatDateToISO(target);
}

/** Monday of the week that contains the date. */
export function startOfWeek(iso: string): string {
  const daysSinceMonday = (parseISODate(iso).getDay() + 6) % 7;
  return addDaysIso(iso, -daysSinceMonday);
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonth(iso: string): string {
  const date = parseISODate(iso);
  return formatDateToISO(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

/**
 * Format date in standard Italian format: gg/mm/aaaa (dd/mm/yyyy)
 */
export function formatDateToIT(date: Date | string | null | undefined): string {
  if (!date) return '';
  if (typeof date === 'string') {
    const trimmed = date.trim();
    // Already in dd/mm/yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    // Standard ISO yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      return `${d}/${m}/${y}`;
    }
    // Date with time or other format
    const dObj = new Date(trimmed);
    if (!isNaN(dObj.getTime())) {
      const d = String(dObj.getDate()).padStart(2, '0');
      const m = String(dObj.getMonth() + 1).padStart(2, '0');
      const y = dObj.getFullYear();
      return `${d}/${m}/${y}`;
    }
    return trimmed;
  }
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** True for a real calendar date written as YYYY-MM-DD (so 2026-02-30 is rejected). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y = 0, m = 1, d = 1] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** A timestamp as short Italian date and time, or the text itself when it is not a timestamp. */
export function formatDateTimeIT(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}
