import { describe, expect, it } from 'vitest';
import {
  daysByTag,
  evaluateFormula,
  formulaExample,
  formulaInputTeams,
  formulaProblem,
  formulaSamples,
  parseFormula,
  roundToHalfDays,
  suggestedDays,
} from './teamFormula';
import type { Team } from './types';

const team = (id: string, tag: string, formula?: string): Team => ({
  id,
  name: id,
  tag,
  colorId: 'blue',
  phase: 'development',
  position: 0,
  ...(formula ? { formula } : {}),
});

const TEAMS = [
  team('server', 'ServerSide'),
  team('ios', 'iOSDev'),
  team('android', 'AndDev'),
  team('qa', 'QA', '0.12*(ServerSide+iOSDev+AndDev)'),
];

const value = (text: string, days: Record<string, number>) => {
  const parsed = parseFormula(text);
  if (!parsed.ok) throw new Error(parsed.error);
  return evaluateFormula(parsed.node, days);
};

describe('formulas', () => {
  it('read numbers, tags, the four operations and parentheses, with precedence', () => {
    expect(
      value('0.12*(ServerSide+iOSDev+AndDev)', { ServerSide: 12, iOSDev: 8, AndDev: 10 }),
    ).toBeCloseTo(3.6);
    expect(value('1 + 2 * 3', {})).toBe(7);
    expect(value('(1 + 2) * 3', {})).toBe(9);
    expect(value('10 / 4 - 1', {})).toBe(1.5);
    expect(value('-QA + 3', { QA: 1 })).toBe(2);
    expect(value('0,5*BA', { BA: 7 })).toBe(3.5);
  });

  it('count a tag not given as 0 and list the tags once', () => {
    expect(value('ServerSide + iOSDev', { ServerSide: 5 })).toBe(5);
    const parsed = parseFormula('a + b * a');
    expect(parsed.ok && parsed.tags).toEqual(['a', 'b']);
  });

  it('say what does not read', () => {
    const error = (text: string) => {
      const parsed = parseFormula(text);
      return parsed.ok ? null : parsed.error;
    };
    expect(error('')).toBe('la formula è vuota');
    expect(error('0.12*(A+B')).toBe('manca una parentesi chiusa');
    expect(error('0.12*')).toBe('manca un numero o il tag di un team');
    expect(error('A B')).toBe('«B» inatteso');
    expect(error('12%')).toBe('carattere «%» inatteso');
    expect(error(')')).toBe('«)» inatteso');
  });

  it('round the days to the nearest half day, at least half a day when there is work', () => {
    expect(roundToHalfDays(3.6)).toBe(3.5);
    expect(roundToHalfDays(3.76)).toBe(4);
    expect(roundToHalfDays(0.1)).toBe(0.5);
    expect(roundToHalfDays(0)).toBe(0);
    expect(roundToHalfDays(-2)).toBe(0);
    expect(roundToHalfDays(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('may name only the tags of teams without a formula', () => {
    expect(formulaProblem('', TEAMS)).toBeNull();
    expect(formulaProblem('0.1*(ServerSide+AndDev)', TEAMS)).toBeNull();
    expect(formulaProblem('0.1*(ServerSide+Design)', TEAMS)).toBe(
      '«Design» non è il tag di un team.',
    );
    expect(formulaProblem('0.5*QA', TEAMS)).toBe(
      '«QA» ha una formula a sua volta: una formula può nominare solo team senza formula.',
    );
    expect(formulaProblem('0.5*ServerSide', TEAMS, 'server')).toBe(
      'Una formula non può nominare il suo stesso team («ServerSide»).',
    );
    expect(formulaProblem('0.12*(', TEAMS)).toBe(
      'Formula non valida: manca un numero o il tag di un team.',
    );
    expect(formulaProblem('1+'.repeat(101), TEAMS)).toBe(
      'Formula troppo lunga: al massimo 200 caratteri.',
    );
    expect(formulaInputTeams({ teams: TEAMS }).map((item) => item.id)).toEqual([
      'server',
      'ios',
      'android',
    ]);
  });

  it('suggest the days of a team from the days of the others', () => {
    const days = { server: 12, ios: 8, android: 10 };
    expect(daysByTag(TEAMS, days)).toEqual({ ServerSide: 12, iOSDev: 8, AndDev: 10, QA: 0 });
    expect(suggestedDays('0.12*(ServerSide+iOSDev+AndDev)', TEAMS, days)).toBe(3.5);
    expect(suggestedDays('0.10*(ServerSide+iOSDev+AndDev)', TEAMS, days)).toBe(3);
    expect(suggestedDays('0.12*(ServerSide+iOSDev+AndDev)', TEAMS, {})).toBeNull();
    expect(suggestedDays(undefined, TEAMS, days)).toBeNull();
    expect(suggestedDays('ServerSide/0', TEAMS, days)).toBeNull();
    expect(suggestedDays('0.12*(', TEAMS, days)).toBeNull();
  });

  it('show an example with ten days for every team named', () => {
    expect(formulaExample('0.12*(ServerSide+iOSDev+AndDev)')).toBe(
      'con 10 giorni per ServerSide, iOSDev e AndDev: 3,5 giorni',
    );
    expect(formulaExample('0.1*QA')).toBe('con 10 giorni per QA: 1 giorno');
    expect(formulaExample('2')).toBe('sempre 2 giorni');
    expect(formulaExample('(')).toBeNull();
  });

  it('offer three samples to copy on the tags that can be named', () => {
    const samples = formulaSamples(['ServerSide', 'iOSDev', 'AndDev', 'CONTENT']);
    expect(samples.map((sample) => sample.formula)).toEqual([
      '0.12*(ServerSide+iOSDev+AndDev)',
      '(ServerSide+iOSDev)/2',
      '2+0.05*(ServerSide+iOSDev+AndDev)',
    ]);
    for (const sample of samples) expect(formulaProblem(sample.formula, TEAMS)).toBeNull();
    expect(samples[0]?.description).toBe('Il 12% dei giorni di ServerSide, iOSDev e AndDev.');
    expect(formulaSamples(['QA']).map((sample) => sample.formula)).toEqual([
      '0.12*QA',
      'QA/2',
      '2+0.05*QA',
    ]);
    expect(formulaSamples([])[0]?.formula).toBe('0.12*(ServerSide+iOSDev+AndDev)');
    expect(formulaSamples(['UX/UI', 'Front end', 'QA'])[1]?.formula).toBe('QA/2');
    expect(formulaSamples(['UX/UI'])[0]?.formula).toBe('0.12*(ServerSide+iOSDev+AndDev)');
  });
});
