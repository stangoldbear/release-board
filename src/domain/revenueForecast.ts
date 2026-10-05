import { formatDateToIT, isIsoDate } from '../utils/dateUtils';
import { parseLocaleNumber } from './numberFormat';
import type { ApprovalLight, DailyMetric } from './types';

/** The longest promotion title kept; the security rules allow the same. */
export const MAX_PROMO_LENGTH = 200;

/** A row of the file that was left out, and why. */
export interface ForecastProblem {
  /** Row number in the file, as the spreadsheet shows it. */
  line: number;
  message: string;
}

export type ForecastParseResult =
  { ok: true; days: DailyMetric[]; problems: ForecastProblem[] } | { ok: false; error: string };

/** The columns of the forecast sheet, by their normalized header. */
const COLUMNS = {
  month: 'month',
  date: 'date',
  weekday: 'day',
  value: 'ov',
  promoEu: 'eu markets',
  promoNonEu: 'non eu markets',
  approval: 'approval light',
} as const;

type ColumnKey = keyof typeof COLUMNS;

const MONTHS: Record<string, number> = {
  gen: 1,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  mag: 5,
  may: 5,
  giu: 6,
  jun: 6,
  lug: 7,
  jul: 7,
  ago: 8,
  aug: 8,
  set: 9,
  sep: 9,
  ott: 10,
  oct: 10,
  nov: 11,
  dic: 12,
  dec: 12,
};

const MONTH_NAMES = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];

/** Day of the week as Date.getDay() counts it, by English or Italian name. */
const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  domenica: 0,
  lunedi: 1,
  martedi: 2,
  mercoledi: 3,
  giovedi: 4,
  venerdi: 5,
  sabato: 6,
};

const WEEKDAY_NAMES = [
  'domenica',
  'lunedì',
  'martedì',
  'mercoledì',
  'giovedì',
  'venerdì',
  'sabato',
];

const LIGHTS: Record<string, ApprovalLight> = {
  green: 'green',
  verde: 'green',
  orange: 'orange',
  arancione: 'orange',
  arancio: 'orange',
  red: 'red',
  rosso: 'red',
};

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Rows and cells of a delimited text, with quoted cells, doubled quotes and line breaks in quotes. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = false;
    } else if (char === '"' && cell === '') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Where each column is, from the first row of the first rows that names Date and OV. */
function findHeader(
  rows: string[][],
): { index: number; columns: Partial<Record<ColumnKey, number>> } | null {
  for (let index = 0; index < Math.min(rows.length, 20); index += 1) {
    const names = (rows[index] ?? []).map(normalize);
    const columns: Partial<Record<ColumnKey, number>> = {};
    for (const [key, header] of Object.entries(COLUMNS) as [ColumnKey, string][]) {
      const position = names.indexOf(header);
      if (position !== -1) columns[key] = position;
    }
    if (columns.date !== undefined && columns.value !== undefined) return { index, columns };
  }
  return null;
}

/** "5-ott-26", "05/10/2026" or "2026-10-05" as YYYY-MM-DD; null when it is not a real date. */
export function parseForecastDate(text: string): string | null {
  const cleaned = text.trim().toLowerCase();
  let day: number;
  let month: number | undefined;
  let year: number;
  const named = /^(\d{1,2})[-\s/.]+([a-z]+)\.?[-\s/.]+(\d{2}|\d{4})$/.exec(cleaned);
  const numeric = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(cleaned);
  if (isIsoDate(cleaned)) return cleaned;
  if (named) {
    day = Number(named[1]);
    month = MONTHS[(named[2] ?? '').slice(0, 3)];
    year = Number(named[3]);
  } else if (numeric) {
    day = Number(numeric[1]);
    month = Number(numeric[2]);
    year = Number(numeric[3]);
  } else {
    return null;
  }
  if (month === undefined) return null;
  if (year < 100) year += 2000;
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return isIsoDate(iso) ? iso : null;
}

/** The row as a day of the forecast, or why it cannot be one. */
function readRow(
  cells: string[],
  columns: Partial<Record<ColumnKey, number>>,
): DailyMetric | string {
  const cell = (key: ColumnKey) =>
    columns[key] === undefined ? '' : (cells[columns[key]] ?? '').trim();

  const dateText = cell('date');
  if (!dateText) return 'manca la data';
  const date = parseForecastDate(dateText);
  if (!date) return `data «${dateText}» non valida`;
  const [year = 0, monthNumber = 1, dayNumber = 1] = date.split('-').map(Number);

  const monthText = cell('month');
  if (/^\d+$/.test(monthText) && Number(monthText) !== monthNumber) {
    return `MONTH ${monthText} non corrisponde alla data (${MONTH_NAMES[monthNumber - 1]})`;
  }
  const weekdayText = cell('weekday');
  const weekday = WEEKDAYS[normalize(weekdayText)];
  const actualWeekday = new Date(year, monthNumber - 1, dayNumber).getDay();
  if (weekday !== undefined && weekday !== actualWeekday) {
    return `day «${weekdayText}» non corrisponde alla data (${WEEKDAY_NAMES[actualWeekday]})`;
  }

  const valueText = cell('value');
  if (!valueText) return 'manca il valore OV';
  const value = parseLocaleNumber(valueText);
  if (value === null) return `valore OV «${valueText}» non numerico`;

  const day: DailyMetric = { date, value };
  const lightText = cell('approval');
  if (lightText) {
    const light = LIGHTS[normalize(lightText)];
    if (!light) return `semaforo «${lightText}» non riconosciuto: usa Green, Orange o Red`;
    day.approval = light;
  }
  for (const [key, label] of [
    ['promoEu', 'promo EU'],
    ['promoNonEu', 'promo non EU'],
  ] as const) {
    const promo = cell(key).replace(/\s+/g, ' ');
    if (promo.length > MAX_PROMO_LENGTH) {
      return `${label} troppo lunga (oltre ${MAX_PROMO_LENGTH} caratteri)`;
    }
    if (promo) day[key] = promo;
  }
  return day;
}

/**
 * Reads the revenue forecast exported from the spreadsheet as CSV: the header row names the columns
 * (Date and OV are required; MONTH, day, EU MARKETS, NON EU MARKETS and Approval light are used
 * when present), and every following row is a day. Rows that cannot be read are left out, each
 * with its reason; empty rows are skipped.
 */
export function parseRevenueForecast(text: string): ForecastParseResult {
  const content = text.replace(/^\uFEFF/, '');
  if (!content.trim()) return { ok: false, error: 'Il file è vuoto.' };

  // Google Sheets uses commas; other tools semicolons or tabs.
  for (const delimiter of [',', ';', '\t']) {
    const rows = parseDelimited(content, delimiter);
    const header = findHeader(rows);
    if (!header) continue;

    const days: DailyMetric[] = [];
    const problems: ForecastProblem[] = [];
    const lineOf = new Map<string, number>();
    rows.slice(header.index + 1).forEach((cells, offset) => {
      const line = header.index + offset + 2;
      if (cells.every((item) => item.trim() === '')) return;
      const result = readRow(cells, header.columns);
      if (typeof result === 'string') {
        problems.push({ line, message: result });
      } else if (lineOf.has(result.date)) {
        problems.push({
          line,
          message: `il ${formatDateToIT(result.date)} compare già alla riga ${lineOf.get(result.date)}`,
        });
      } else {
        lineOf.set(result.date, line);
        days.push(result);
      }
    });
    days.sort((a, b) => a.date.localeCompare(b.date));
    return { ok: true, days, problems };
  }

  return {
    ok: false,
    error:
      'Non trovo le colonne «Date» e «OV». Controlla di aver scaricato il foglio giusto, in formato CSV.',
  };
}
