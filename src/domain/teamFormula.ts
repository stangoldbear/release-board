import { formatLocaleNumber } from './numberFormat';
import type { RoadmapConfig, Team } from './types';

// The formula of a team: how many days of effort it takes on a project from the days of the other
// teams, as "0.12*(ServerSide+iOSDev+AndDev)". Numbers, the tags of the teams, the four
// operations and parentheses. A formula may name only teams without a formula of their own, so
// that no formula depends on another, and the result is rounded to the half day.

/** Longest formula; the security rules enforce the same. */
export const FORMULA_MAX = 200;

/** The days each named team is given in the example the editor shows. */
const EXAMPLE_DAYS = 10;

type Operator = '+' | '-' | '*' | '/';

export type FormulaNode =
  | { kind: 'number'; value: number }
  | { kind: 'tag'; name: string }
  | { kind: 'negate'; operand: FormulaNode }
  | { kind: 'binary'; operator: Operator; left: FormulaNode; right: FormulaNode };

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'tag'; name: string }
  | { kind: 'symbol'; value: Operator | '(' | ')' };

export type FormulaParse =
  { ok: true; node: FormulaNode; tags: string[] } | { ok: false; error: string };

const TOKEN = /\s*(?:(\d+(?:[.,]\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|([-+*/()]))/y;

function tokenize(text: string): Token[] | string {
  const tokens: Token[] = [];
  TOKEN.lastIndex = 0;
  let at = 0;
  while (at < text.length) {
    if (/^\s+$/.test(text.slice(at))) break;
    TOKEN.lastIndex = at;
    const match = TOKEN.exec(text);
    if (!match) return `carattere «${text.slice(at).trim().charAt(0)}» inatteso`;
    const [, number, tag, symbol] = match;
    if (number !== undefined)
      tokens.push({ kind: 'number', value: Number(number.replace(',', '.')) });
    else if (tag !== undefined) tokens.push({ kind: 'tag', name: tag });
    else tokens.push({ kind: 'symbol', value: symbol as Operator | '(' | ')' });
    at = TOKEN.lastIndex;
  }
  return tokens;
}

/** Reads a formula; the error says, in words, what does not fit. */
export function parseFormula(text: string): FormulaParse {
  const read = tokenize(text);
  if (typeof read === 'string') return { ok: false, error: read };
  if (read.length === 0) return { ok: false, error: 'la formula è vuota' };
  // In a constant of its own: the narrowing above does not reach the functions below.
  const tokens: Token[] = read;
  const tags = new Set<string>();
  let position = 0;
  const peek = (): Token | undefined => tokens[position];
  const symbol = (value: string): boolean => {
    const token = peek();
    return token?.kind === 'symbol' && token.value === value;
  };

  function expression(): FormulaNode | string {
    let left = term();
    while (typeof left !== 'string' && (symbol('+') || symbol('-'))) {
      const operator = (tokens[position++] as { value: Operator }).value;
      const right = term();
      if (typeof right === 'string') return right;
      left = { kind: 'binary', operator, left, right };
    }
    return left;
  }
  function term(): FormulaNode | string {
    let left = factor();
    while (typeof left !== 'string' && (symbol('*') || symbol('/'))) {
      const operator = (tokens[position++] as { value: Operator }).value;
      const right = factor();
      if (typeof right === 'string') return right;
      left = { kind: 'binary', operator, left, right };
    }
    return left;
  }
  function factor(): FormulaNode | string {
    const token = tokens[position++];
    if (!token) return 'manca un numero o il tag di un team';
    if (token.kind === 'number') return { kind: 'number', value: token.value };
    if (token.kind === 'tag') {
      tags.add(token.name);
      return { kind: 'tag', name: token.name };
    }
    if (token.value === '-') {
      const operand = factor();
      return typeof operand === 'string' ? operand : { kind: 'negate', operand };
    }
    if (token.value === '(') {
      const inner = expression();
      if (typeof inner === 'string') return inner;
      if (!symbol(')')) return 'manca una parentesi chiusa';
      position += 1;
      return inner;
    }
    return `«${token.value}» inatteso`;
  }

  const node = expression();
  if (typeof node === 'string') return { ok: false, error: node };
  const rest = peek();
  if (rest) {
    const what = rest.kind === 'symbol' ? rest.value : rest.kind === 'tag' ? rest.name : rest.value;
    return { ok: false, error: `«${what}» inatteso` };
  }
  return { ok: true, node, tags: [...tags] };
}

/** The value of a formula with the days of each tag; a tag not given counts as 0. */
export function evaluateFormula(node: FormulaNode, days: Readonly<Record<string, number>>): number {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'tag':
      return days[node.name] ?? 0;
    case 'negate':
      return -evaluateFormula(node.operand, days);
    case 'binary': {
      const left = evaluateFormula(node.left, days);
      const right = evaluateFormula(node.right, days);
      switch (node.operator) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return left / right;
      }
    }
  }
}

/** Days of effort rounded to the nearest half day, and at least half a day when there is work. */
export function roundToHalfDays(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(0.5, Math.round(value * 2) / 2);
}

/**
 * Why a formula cannot be used, in words, or null when it can: it must read, and name only the
 * tags of teams without a formula of their own (`selfId`: the team the formula is for).
 */
export function formulaProblem(
  text: string,
  teams: readonly Team[],
  selfId?: string,
): string | null {
  if (text.trim() === '') return null;
  if (text.length > FORMULA_MAX)
    return `Formula troppo lunga: al massimo ${FORMULA_MAX} caratteri.`;
  const parsed = parseFormula(text);
  if (!parsed.ok) return `Formula non valida: ${parsed.error}.`;
  for (const tag of parsed.tags) {
    const team = teams.find((item) => item.tag === tag);
    if (!team) return `«${tag}» non è il tag di un team.`;
    if (team.id === selfId) return `Una formula non può nominare il suo stesso team («${tag}»).`;
    if (team.formula?.trim()) {
      return `«${tag}» ha una formula a sua volta: una formula può nominare solo team senza formula.`;
    }
  }
  return null;
}

/** The days by tag from the days by team: two teams with the same tag add up. */
export function daysByTag(
  teams: readonly Team[],
  daysByTeam: Readonly<Record<string, number>>,
): Record<string, number> {
  const days: Record<string, number> = {};
  for (const team of teams) {
    days[team.tag] = (days[team.tag] ?? 0) + (daysByTeam[team.id] ?? 0);
  }
  return days;
}

/**
 * The days a formula suggests from the days given to each team, rounded to the half day; null
 * without a formula, with one that does not read, or when it gives no work.
 */
export function suggestedDays(
  formula: string | undefined,
  teams: readonly Team[],
  daysByTeam: Readonly<Record<string, number>>,
): number | null {
  if (!formula?.trim()) return null;
  const parsed = parseFormula(formula);
  if (!parsed.ok) return null;
  const days = roundToHalfDays(evaluateFormula(parsed.node, daysByTag(teams, daysByTeam)));
  return days > 0 ? days : null;
}

/** "con 10 giorni per ServerSide, iOSDev e AndDev: 3,5 giorni": what a formula gives, as an example. */
export function formulaExample(text: string): string | null {
  const parsed = parseFormula(text);
  if (!parsed.ok) return null;
  const days = roundToHalfDays(
    evaluateFormula(parsed.node, Object.fromEntries(parsed.tags.map((tag) => [tag, EXAMPLE_DAYS]))),
  );
  const result = `${formatLocaleNumber(days, Number.isInteger(days) ? 0 : 1)} ${days === 1 ? 'giorno' : 'giorni'}`;
  if (parsed.tags.length === 0) return `sempre ${result}`;
  const names =
    parsed.tags.length > 1
      ? `${parsed.tags.slice(0, -1).join(', ')} e ${parsed.tags.at(-1) ?? ''}`
      : (parsed.tags[0] ?? '');
  return `con ${EXAMPLE_DAYS} giorni per ${names}: ${result}`;
}

/** The teams that a formula may name: those without a formula, in their order. */
export function formulaInputTeams(config: Pick<RoadmapConfig, 'teams'>): Team[] {
  return config.teams.filter((team) => !team.formula?.trim());
}
