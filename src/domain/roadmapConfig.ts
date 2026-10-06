import { formatDateToIT, isIsoDate } from '../utils/dateUtils';
import { isKnownColorId } from './colors';
import { formatLocaleNumber, parseLocaleNumber } from './numberFormat';
import defaults from './roadmapDefaults.json';
import type {
  Absence,
  FieldOption,
  FieldType,
  FieldValue,
  Price,
  Project,
  ProjectField,
  ProjectFieldValues,
  RoadmapConfig,
  Stakeholder,
  Team,
} from './types';

// The configuration of the roadmap: how the projects are described. The parsers here are shared
// by the defaults file, the backups and the Firestore documents, so that the three agree on what
// a field, a team or a stakeholder is.

/** Longest texts of the configuration; the security rules enforce the same. */
export const FIELD_LABEL_MAX = 60;
export const FIELD_DESCRIPTION_MAX = 300;
export const FIELD_OPTIONS_MAX = 50;
export const FIELD_OPTION_LABEL_MAX = 60;
export const TEAM_NAME_MAX = 60;
export const TEAM_TAG_MAX = 20;
export const STAKEHOLDER_NAME_MAX = 60;
export const STAKEHOLDER_INFO_MAX = 500;
export const ABSENCES_MAX = 100;
export const ABSENCE_REASON_MAX = 100;
/** Fields a project can have values for, values of one field, and the longest text among them. */
export const PROJECT_FIELDS_MAX = 50;
export const FIELD_VALUES_MAX = 50;
export const FIELD_TEXT_MAX = 2000;

/** Ids of the configuration: letters, digits, dashes and underscores, as "server-1" or "jiraEpics". */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

export function isRoadmapId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

export const FIELD_TYPES: readonly FieldType[] = [
  'text',
  'textarea',
  'number',
  'price',
  'url',
  'date',
  'choice',
];

/** Each type with its Italian name and what it holds, for the editor of the fields. */
export const FIELD_TYPE_INFO: Record<FieldType, { label: string; description: string }> = {
  text: {
    label: 'Testo breve',
    description: 'Una riga di testo, come un nome o una stima scritta a mano.',
  },
  textarea: { label: 'Testo lungo', description: 'Più righe di testo, con gli a capo.' },
  number: { label: 'Numero', description: 'Un numero, con i decimali se servono.' },
  price: { label: 'Prezzo', description: 'Un importo con la sua valuta, per esempio 12.000 EUR.' },
  url: {
    label: 'Link',
    description: 'Un indirizzo web che inizia con https://, mostrato come collegamento.',
  },
  date: { label: 'Data', description: 'Un giorno del calendario.' },
  choice: {
    label: 'Lista di valori',
    description:
      'Uno o più valori scelti tra quelli che definisci qui: esclusivi (uno solo) o additivi (più di uno).',
  },
};

/** The flags of a field: the English name used in the editor, its translation and what it does. */
export const FIELD_FLAG_INFO = {
  multiple: {
    label: 'Più valori',
    description:
      'Il campo tiene una lista di valori, per esempio più link. Per una lista di valori: additivi invece che esclusivi.',
  },
  required: {
    label: 'Almeno uno',
    description: 'La finestra del progetto chiede almeno un valore prima di salvare.',
  },
  main: {
    label: 'Principale',
    description:
      'Il valore compare sotto il titolo nella roadmap, al livello «Info principali», e non solo nella finestra del progetto.',
  },
  group: {
    label: 'Raggruppa',
    description:
      'La roadmap può raggruppare i progetti per i valori di questo campo: si sceglie in «Raggruppa per», sotto la roadmap. Solo per una lista di valori esclusivi, così ogni progetto sta in un gruppo solo.',
  },
} as const;

/** Currencies offered first; any three-letter code is accepted. */
export const CURRENCIES: readonly string[] = ['EUR', 'USD', 'GBP', 'CHF'];
export const DEFAULT_CURRENCY = 'EUR';

type Data = Record<string, unknown>;

function isData(value: unknown): value is Data {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.trim() !== '' && value.length <= max ? value : null;
}

function position(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A team from its data; null when the data does not describe one. */
export function parseTeam(id: string, value: unknown, fallbackPosition: number): Team | null {
  if (!isRoadmapId(id) || !isData(value)) return null;
  const name = text(value.name, TEAM_NAME_MAX);
  const tag = text(value.tag, TEAM_TAG_MAX);
  if (!name || !tag || typeof value.colorId !== 'string' || !isKnownColorId(value.colorId))
    return null;
  return {
    id,
    name,
    tag,
    colorId: value.colorId,
    position: position(value.position, fallbackPosition),
  };
}

/** An absence from its data; null when the dates are not a range. */
export function parseAbsence(value: unknown): Absence | null {
  if (!isData(value) || !isIsoDate(value.start) || !isIsoDate(value.end)) return null;
  if (value.end < value.start) return null;
  const absence: Absence = { start: value.start, end: value.end };
  const reason = text(value.reason, ABSENCE_REASON_MAX);
  if (reason) absence.reason = reason;
  return absence;
}

/** A stakeholder from its data; absences that are not ranges are left out. */
export function parseStakeholder(
  id: string,
  value: unknown,
  fallbackPosition: number,
): Stakeholder | null {
  if (!isRoadmapId(id) || !isData(value)) return null;
  const name = text(value.name, STAKEHOLDER_NAME_MAX);
  if (!name || !isRoadmapId(value.teamId)) return null;
  const absences: Absence[] = Array.isArray(value.absences)
    ? value.absences
        .slice(0, ABSENCES_MAX)
        .map(parseAbsence)
        .filter((absence): absence is Absence => absence !== null)
        .sort((a, b) => a.start.localeCompare(b.start))
    : [];
  const stakeholder: Stakeholder = {
    id,
    name,
    teamId: value.teamId,
    absences,
    position: position(value.position, fallbackPosition),
  };
  const info = text(value.info, STAKEHOLDER_INFO_MAX);
  if (info) stakeholder.info = info;
  return stakeholder;
}

function parseOptions(value: unknown): FieldOption[] | null {
  if (!Array.isArray(value) || value.length > FIELD_OPTIONS_MAX) return null;
  const options: FieldOption[] = [];
  for (const item of value) {
    if (!isData(item) || !isRoadmapId(item.id)) return null;
    const label = text(item.label, FIELD_OPTION_LABEL_MAX);
    if (!label || options.some((option) => option.id === item.id)) return null;
    const option: FieldOption = { id: item.id, label };
    // A color the app does not know is left out: the value shows as a neutral tag.
    if (typeof item.colorId === 'string' && isKnownColorId(item.colorId)) {
      option.colorId = item.colorId;
    }
    options.push(option);
  }
  return options;
}

/** A field definition from its data; null when it is not one. A choice field needs its options. */
export function parseProjectField(
  id: string,
  value: unknown,
  fallbackPosition: number,
): ProjectField | null {
  if (!isRoadmapId(id) || !isData(value)) return null;
  const label = text(value.label, FIELD_LABEL_MAX);
  if (!label || !isFieldType(value.type)) return null;
  const field: ProjectField = {
    id,
    label,
    type: value.type,
    multiple: value.multiple === true,
    required: value.required === true,
    main: value.main === true,
    position: position(value.position, fallbackPosition),
  };
  const description = text(value.description, FIELD_DESCRIPTION_MAX);
  if (description) field.description = description;
  if (value.type === 'choice') {
    const options = parseOptions(value.options);
    if (!options || options.length === 0) return null;
    field.options = options;
  }
  if (value.group === true && isGroupable({ ...field, group: true })) field.group = true;
  return field;
}

/** Whether the roadmap can group the projects by a field: a choice of one value, marked so. */
export function isGroupable(field: Pick<ProjectField, 'type' | 'multiple' | 'group'>): boolean {
  return field.group === true && field.type === 'choice' && !field.multiple;
}

/** The projects with the same value of a field; the option is null for those without one. */
export interface ProjectGroup<T> {
  option: FieldOption | null;
  projects: T[];
}

/**
 * The projects grouped by the value of a field that groups: in the order of its options, then the
 * projects without a value, or with one no longer among the options. Each group keeps the order of
 * the projects; empty groups are left out.
 */
export function groupProjects<T extends Pick<Project, 'fields'>>(
  projects: readonly T[],
  field: ProjectField,
): ProjectGroup<T>[] {
  const valueOf = (project: T) => {
    const [value] = fieldValuesOf(project, field);
    return typeof value === 'string' ? value : null;
  };
  const groups: ProjectGroup<T>[] = (field.options ?? []).map((option) => ({
    option,
    projects: projects.filter((project) => valueOf(project) === option.id),
  }));
  groups.push({ option: null, projects: projects.filter((project) => valueOf(project) === null) });
  return groups.filter((group) => group.projects.length > 0);
}

export function isFieldType(value: unknown): value is FieldType {
  return (FIELD_TYPES as readonly unknown[]).includes(value);
}

function isPrice(value: unknown): value is Price {
  return (
    isData(value) &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    typeof value.currency === 'string' &&
    /^[A-Z]{3}$/.test(value.currency)
  );
}

/** Whether a value has the shape of a field value, whatever its field. */
export function isFieldValue(value: unknown): value is FieldValue {
  if (typeof value === 'string') return value.trim() !== '' && value.length <= FIELD_TEXT_MAX;
  if (typeof value === 'number') return Number.isFinite(value);
  return isPrice(value);
}

/**
 * The values of the custom fields of a project from their data: entries that are not lists of
 * values are left out, as are values that are not ones. Null when the data is not a map.
 */
export function parseFieldValues(value: unknown): ProjectFieldValues | null {
  if (!isData(value)) return null;
  const values: ProjectFieldValues = {};
  for (const [fieldId, list] of Object.entries(value).slice(0, PROJECT_FIELDS_MAX)) {
    if (!isRoadmapId(fieldId) || !Array.isArray(list)) continue;
    const kept = list.slice(0, FIELD_VALUES_MAX).filter(isFieldValue);
    if (kept.length > 0) values[fieldId] = kept;
  }
  return values;
}

/** The configuration from its three lists of data, in their order; items that do not fit are left out. */
export function parseRoadmapConfig(value: unknown): RoadmapConfig {
  const data = isData(value) ? value : {};
  const items = (list: unknown): Data[] => (Array.isArray(list) ? list.filter(isData) : []);
  const idOf = (item: Data) => (typeof item.id === 'string' ? item.id : '');
  return {
    fields: sortByPosition(
      items(data.fields).flatMap((item, at) => parseProjectField(idOf(item), item, at) ?? []),
    ),
    teams: sortByPosition(
      items(data.teams).flatMap((item, at) => parseTeam(idOf(item), item, at) ?? []),
    ),
    stakeholders: sortByPosition(
      items(data.stakeholders).flatMap((item, at) => parseStakeholder(idOf(item), item, at) ?? []),
    ),
  };
}

/** The configuration a plan starts with, from roadmapDefaults.json. */
export function defaultRoadmapConfig(): RoadmapConfig {
  return parseRoadmapConfig(defaults);
}

/** True when the configuration has nothing in it, as in a shared plan from before the 0.7. */
export function isRoadmapConfigEmpty(config: RoadmapConfig): boolean {
  return (
    config.fields.length === 0 && config.teams.length === 0 && config.stakeholders.length === 0
  );
}

/** Items in their order; the id breaks ties, so that every copy agrees. */
export function sortByPosition<T extends { id: string; position: number }>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

/** The position of an item added after all the others. */
export function nextPosition(items: readonly { position: number }[]): number {
  return items.reduce((last, item) => Math.max(last, item.position), -1) + 1;
}

/** The team of a stakeholder, when the configuration still has it. */
export function teamOf(
  config: RoadmapConfig,
  stakeholder: Pick<Stakeholder, 'teamId'>,
): Team | null {
  return config.teams.find((team) => team.id === stakeholder.teamId) ?? null;
}

/** The stakeholders by team, in the order of the teams; those of a team that is gone come last. */
export function stakeholdersByTeam(
  config: RoadmapConfig,
): { team: Team | null; stakeholders: Stakeholder[] }[] {
  const groups: { team: Team | null; stakeholders: Stakeholder[] }[] = config.teams.map((team) => ({
    team,
    stakeholders: config.stakeholders.filter((item) => item.teamId === team.id),
  }));
  const orphans = config.stakeholders.filter((item) => teamOf(config, item) === null);
  if (orphans.length > 0) groups.push({ team: null, stakeholders: orphans });
  return groups.filter((group) => group.team !== null || group.stakeholders.length > 0);
}

/** Whether a value fits a field: its type, and for a choice one of its options. */
export function fitsField(field: ProjectField, value: FieldValue): boolean {
  switch (field.type) {
    case 'number':
      return typeof value === 'number';
    case 'price':
      return typeof value === 'object';
    case 'date':
      return isIsoDate(value);
    case 'url':
      return typeof value === 'string' && isHttpUrl(value);
    case 'choice':
      return (
        typeof value === 'string' && (field.options ?? []).some((option) => option.id === value)
      );
    default:
      return typeof value === 'string';
  }
}

/** The values a project has for a field, those that fit it; one at most when the field is single. */
export function fieldValuesOf(project: Pick<Project, 'fields'>, field: ProjectField): FieldValue[] {
  const values = (project.fields?.[field.id] ?? []).filter((value) => fitsField(field, value));
  return field.multiple ? values : values.slice(0, 1);
}

/** The required fields a project has no value for. */
export function missingRequiredFields(
  fields: readonly ProjectField[],
  values: ProjectFieldValues,
): ProjectField[] {
  return fields.filter(
    (field) => field.required && fieldValuesOf({ fields: values }, field).length === 0,
  );
}

/** A value of a field in words: dates in Italian, numbers with the locale, options by label. */
export function formatFieldValue(field: ProjectField, value: FieldValue): string {
  if (typeof value === 'number') {
    return formatLocaleNumber(value, Number.isInteger(value) ? 0 : 2);
  }
  if (typeof value === 'object') {
    const decimals = Number.isInteger(value.amount) ? 0 : 2;
    return `${formatLocaleNumber(value.amount, decimals)} ${value.currency}`;
  }
  if (field.type === 'date') return formatDateToIT(value);
  if (field.type === 'choice') {
    return (field.options ?? []).find((option) => option.id === value)?.label ?? value;
  }
  return value;
}

/** Only http and https links are shown as links: anything else stays text. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * A value of a field from what was typed; null when the text is blank or does not fit the field.
 * Numbers take the Italian notation too ("1.250,5"); prices take their currency apart.
 */
export function parseFieldInput(
  field: ProjectField,
  input: string,
  currency = DEFAULT_CURRENCY,
): FieldValue | null {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed.length > FIELD_TEXT_MAX) return null;
  switch (field.type) {
    case 'number': {
      const amount = parseLocaleNumber(trimmed);
      return amount === null ? null : amount;
    }
    case 'price': {
      const amount = parseLocaleNumber(trimmed);
      return amount === null || !/^[A-Z]{3}$/.test(currency) ? null : { amount, currency };
    }
    case 'date':
      return isIsoDate(trimmed) ? trimmed : null;
    case 'url':
      return isHttpUrl(trimmed) ? trimmed : null;
    case 'choice':
      return (field.options ?? []).some((option) => option.id === trimmed) ? trimmed : null;
    default:
      return trimmed;
  }
}

/** An id from a label, as "Team impattati" gives "team-impattati"; empty when nothing is left. */
export function idFromLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** The id for a new item: from its label, with a number when the id is taken. */
export function uniqueId(label: string, taken: readonly { id: string }[]): string {
  const base = idFromLabel(label) || 'voce';
  let candidate = base;
  for (let count = 2; taken.some((item) => item.id === candidate); count += 1) {
    candidate = `${base.slice(0, 40 - String(count).length - 1)}-${count}`;
  }
  return candidate;
}
