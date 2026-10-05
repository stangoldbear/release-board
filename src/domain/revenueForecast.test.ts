import { describe, expect, it } from 'vitest';
import { parseDelimited, parseForecastDate, parseRevenueForecast } from './revenueForecast';

// As Google Sheets exports it with Italian settings: an empty first row, then the header.
const SHEET = [
  ',,,,,,',
  'MONTH,Date,day,OV,EU MARKETS,NON EU MARKETS,Approval light',
  '10,5-ott-26,Monday,"3.210.123,45",Black Week,Singles Day,Green',
  '10,6-ott-26,Tuesday,"2.100.000,00",,,Orange',
  ',,,,,,',
  '11,30-nov-26,Monday,"4.000.000,50","Cyber Monday, ultime ore",,RED',
].join('\r\n');

describe('parseRevenueForecast', () => {
  it('reads the days of the sheet, with value, approval light and promotions', () => {
    expect(parseRevenueForecast(SHEET)).toEqual({
      ok: true,
      days: [
        {
          date: '2026-10-05',
          value: 3210123.45,
          approval: 'green',
          promoEu: 'Black Week',
          promoNonEu: 'Singles Day',
        },
        { date: '2026-10-06', value: 2100000, approval: 'orange' },
        {
          date: '2026-11-30',
          value: 4000000.5,
          approval: 'red',
          promoEu: 'Cyber Monday, ultime ore',
        },
      ],
      problems: [],
    });
  });

  it('leaves out the rows it cannot read, each with its row number and the reason', () => {
    const rows = [
      'MONTH,Date,day,OV,EU MARKETS,NON EU MARKETS,Approval light',
      '11,31-nov-26,Tuesday,1,,,Green',
      '11,7-ott-26,Wednesday,1,,,Green',
      '10,8-ott-26,Monday,1,,,Green',
      '10,9-ott-26,Friday,,,,Green',
      '10,10-ott-26,Saturday,tanto,,,Green',
      '10,12-ott-26,Monday,1,,,Yellow',
      ',,Monday,1,,,Green',
      '10,13-ott-26,Tuesday,1,,,Green',
      '10,13-ott-26,Tuesday,2,,,Green',
    ].join('\n');
    const result = parseRevenueForecast(rows);
    expect(result.ok && result.days.map((day) => day.date)).toEqual(['2026-10-13']);
    expect(result.ok && result.problems).toEqual([
      { line: 2, message: 'data «31-nov-26» non valida' },
      { line: 3, message: 'MONTH 11 non corrisponde alla data (ottobre)' },
      { line: 4, message: 'day «Monday» non corrisponde alla data (giovedì)' },
      { line: 5, message: 'manca il valore OV' },
      { line: 6, message: 'valore OV «tanto» non numerico' },
      { line: 7, message: 'semaforo «Yellow» non riconosciuto: usa Green, Orange o Red' },
      { line: 8, message: 'manca la data' },
      { line: 10, message: 'il 13/10/2026 compare già alla riga 9' },
    ]);
  });

  it('needs only Date and OV, in any order, with semicolons or tabs', () => {
    const semicolons = 'ov;date\n"1.500,5";2026-10-05\n';
    expect(parseRevenueForecast(semicolons)).toEqual({
      ok: true,
      days: [{ date: '2026-10-05', value: 1500.5 }],
      problems: [],
    });
    const tabs = '\uFEFFDate\tOV\tApproval light\n05/10/2026\t1500\tverde';
    expect(parseRevenueForecast(tabs)).toMatchObject({
      days: [{ date: '2026-10-05', value: 1500, approval: 'green' }],
    });
  });

  it('explains a file that is empty or is not the forecast', () => {
    expect(parseRevenueForecast(' \n ')).toEqual({ ok: false, error: 'Il file è vuoto.' });
    expect(parseRevenueForecast('Nome,Cognome\nAnna,Rossi')).toMatchObject({ ok: false });
  });
});

describe('parseForecastDate', () => {
  it('reads Italian and English month names, numbers and ISO dates', () => {
    expect(parseForecastDate('5-ott-26')).toBe('2026-10-05');
    expect(parseForecastDate('30-nov-26')).toBe('2026-11-30');
    expect(parseForecastDate('5-Oct-2026')).toBe('2026-10-05');
    expect(parseForecastDate('1 set 2026')).toBe('2026-09-01');
    expect(parseForecastDate('05/10/2026')).toBe('2026-10-05');
    expect(parseForecastDate('2026-10-05')).toBe('2026-10-05');
  });

  it('rejects days that do not exist and unknown months', () => {
    expect(parseForecastDate('29-feb-26')).toBeNull();
    expect(parseForecastDate('5-foo-26')).toBeNull();
    expect(parseForecastDate('ottobre')).toBeNull();
  });
});

describe('parseDelimited', () => {
  it('keeps quoted delimiters, doubled quotes and line breaks inside a cell', () => {
    expect(parseDelimited('a,"b, c","d ""e""","f\ng"\n1,2', ',')).toEqual([
      ['a', 'b, c', 'd "e"', 'f\ng'],
      ['1', '2'],
    ]);
  });
});
