import { DEFAULT_DATE_FORMAT, formatDate, isIsoDate } from '../utils/dateUtils';
import type { DateFormat } from '../utils/dateUtils';
import { isKnownColorId } from './colors';
import type { TaskColorId } from './colors';
import { formatLocaleNumber, parseLocaleNumber } from './numberFormat';
import defaults from './roadmapDefaults.json';
import { FORMULA_MAX } from './teamFormula';
import type {
  Absence,
  Closure,
  FieldOption,
  FieldType,
  FieldValue,
  Price,
  Project,
  ProjectColorsMode,
  ProjectField,
  ProjectFieldValues,
  RoadmapConfig,
  Stakeholder,
  Team,
  TeamPhase,
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
export const CLOSURES_MAX = 100;
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
      'Il valore compare nelle informazioni del progetto nella roadmap (pulsante «i»), e non solo nella sua finestra.',
  },
  group: {
    label: 'Raggruppa',
    description:
      'La roadmap può raggruppare i progetti per i valori di questo campo: si sceglie in «Raggruppa per», sotto la roadmap. Solo per una lista di valori esclusivi, così ogni progetto sta in un gruppo solo.',
  },
  quick: {
    label: 'In primo piano',
    description:
      'Il campo compare anche nella vista standard della finestra del progetto, quella con i pochi campi che servono subito; gli altri campi stanno nella vista avanzata.',
  },
} as const;

/** The phases of the teams, in the order of the standard arrangement of a project. */
export const TEAM_PHASES: readonly TeamPhase[] = ['analysis', 'development', 'test'];

/** Each phase with its name and where it falls, for the editor of the teams. */
export const TEAM_PHASE_INFO: Record<TeamPhase, { label: string; description: string }> = {
  analysis: {
    label: 'Analisi',
    description:
      'Lavora per prima, dall’inizio del progetto: analisi e definizione delle attività.',
  },
  development: {
    label: 'Sviluppo',
    description: 'Lavora dopo l’analisi, in parallelo con gli altri team di sviluppo.',
  },
  test: {
    label: 'Test',
    description: 'Lavora dopo l’ultimo sviluppo, prima della contingency.',
  },
};

/** A team read from before the phases existed is a development team. */
export const DEFAULT_TEAM_PHASE: TeamPhase = 'development';

export function isTeamPhase(value: unknown): value is TeamPhase {
  return (TEAM_PHASES as readonly unknown[]).includes(value);
}

/** The shared settings of the roadmap that can change on their own; null clears one. */
export interface RoadmapSettingsChanges {
  contingencyFormula?: string | null;
  projectColors?: ProjectColorsMode;
  /** The field that colors the projects; null for the first that can. */
  colorFieldId?: string | null;
  /** All the company closures; an empty list removes them. */
  closures?: readonly Closure[];
  /** The color of the notes of the days of Next Releases; null for the default one. */
  dayNotesColorId?: TaskColorId | null;
}

/** The color of the notes of the days when the settings choose none: the yellow of a post-it. */
export const DEFAULT_DAY_NOTES_COLOR: TaskColorId = 'yellow';

/** The color of the row «Note» of Next Releases and of the notes of the days. */
export function dayNotesColorOf(config: Pick<RoadmapConfig, 'dayNotesColorId'>): TaskColorId {
  return config.dayNotesColorId ?? DEFAULT_DAY_NOTES_COLOR;
}

export const PROJECT_COLORS_MODES: readonly ProjectColorsMode[] = ['field', 'free'];
export const DEFAULT_PROJECT_COLORS: ProjectColorsMode = 'field';
export const PROJECT_COLORS_INFO: Record<
  ProjectColorsMode,
  { label: string; description: string }
> = {
  field: {
    label: 'Dal campo',
    description:
      'La barra di ogni progetto ha il colore del suo valore in una lista con i colori, come «Dimensione»; senza valore è grigia. La finestra del progetto non chiede il colore.',
  },
  free: {
    label: 'Liberi',
    description:
      'Ogni progetto ha il colore scelto nella sua finestra; un progetto nuovo prende il colore dopo quello dell’ultimo. L’etichetta del campo, come «Dimensione», resta accanto al titolo nel colore del suo valore.',
  },
};

export function isProjectColorsMode(value: unknown): value is ProjectColorsMode {
  return (PROJECT_COLORS_MODES as readonly unknown[]).includes(value);
}

/** The configuration with its settings changed. */
export function applyRoadmapSettings(
  config: RoadmapConfig,
  changes: RoadmapSettingsChanges,
): RoadmapConfig {
  const next = { ...config };
  if (changes.contingencyFormula !== undefined) {
    const formula = changes.contingencyFormula?.trim();
    if (formula) next.contingencyFormula = formula;
    else delete next.contingencyFormula;
  }
  if (changes.projectColors !== undefined) {
    if (changes.projectColors === DEFAULT_PROJECT_COLORS) delete next.projectColors;
    else next.projectColors = changes.projectColors;
  }
  if (changes.colorFieldId !== undefined) {
    if (changes.colorFieldId) next.colorFieldId = changes.colorFieldId;
    else delete next.colorFieldId;
  }
  if (changes.closures !== undefined) {
    if (changes.closures.length > 0) next.closures = sortClosures(changes.closures);
    else delete next.closures;
  }
  if (changes.dayNotesColorId !== undefined) {
    if (changes.dayNotesColorId && changes.dayNotesColorId !== DEFAULT_DAY_NOTES_COLOR) {
      next.dayNotesColorId = changes.dayNotesColorId;
    } else delete next.dayNotesColorId;
  }
  return next;
}

/**
 * The field whose colored values tag the projects beside their titles, and color their bars when
 * the colors come from a field: the one chosen, or the first that can; null without. With free
 * colors it still tags them.
 */
export function projectColorField(
  config: Pick<RoadmapConfig, 'fields' | 'colorFieldId'>,
): ProjectField | null {
  const candidates = config.fields.filter(colorsProjects);
  return candidates.find((field) => field.id === config.colorFieldId) ?? candidates[0] ?? null;
}

/**
 * The color of a project on the roadmap: that of its value of the color field, grey without one;
 * its own color when the colors are free, or when no field colors the projects.
 */
export function projectColorOf(
  project: Pick<Project, 'colorId' | 'fields'>,
  config: Pick<RoadmapConfig, 'fields' | 'colorFieldId' | 'projectColors'>,
): TaskColorId {
  if ((config.projectColors ?? DEFAULT_PROJECT_COLORS) === 'free') return project.colorId;
  const field = projectColorField(config);
  if (!field) return project.colorId;
  return coloredValueOf(project, field)?.colorId ?? 'gray';
}

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
  const team: Team = {
    id,
    name,
    tag,
    colorId: value.colorId,
    phase: isTeamPhase(value.phase) ? value.phase : DEFAULT_TEAM_PHASE,
    position: position(value.position, fallbackPosition),
  };
  const formula = text(value.formula, FORMULA_MAX);
  if (formula) team.formula = formula;
  return team;
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

/** A company closure from its data; null when the dates are not a range. */
export function parseClosure(value: unknown): Closure | null {
  return parseAbsence(value);
}

/** The closures by start, then by end, so that every copy agrees. */
export function sortClosures(closures: readonly Closure[]): Closure[] {
  return [...closures].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}

/** The closures from a list of data, by start; those that are not ranges are left out. */
export function parseClosures(value: unknown): Closure[] {
  if (!Array.isArray(value)) return [];
  return sortClosures(
    value
      .slice(0, CLOSURES_MAX)
      .map(parseClosure)
      .filter((closure): closure is Closure => closure !== null),
  );
}

/** The closure that covers a day, if any. */
export function closureOn(closures: readonly Closure[], iso: string): Closure | null {
  return closures.find((closure) => closure.start <= iso && iso <= closure.end) ?? null;
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
  if (value.default === true) stakeholder.default = true;
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
  if (value.quick === true) field.quick = true;
  return field;
}

/** Whether the roadmap can group the projects by a field: a choice of one value, marked so. */
export function isGroupable(field: Pick<ProjectField, 'type' | 'multiple' | 'group'>): boolean {
  return field.group === true && field.type === 'choice' && !field.multiple;
}

/**
 * Whether the roadmap can color the projects by a field: a choice of one value with at least one
 * colored value. The value of a project gives its row a mark in that color.
 */
export function colorsProjects(field: ProjectField): boolean {
  return (
    field.type === 'choice' &&
    !field.multiple &&
    (field.options ?? []).some((option) => option.colorId !== undefined)
  );
}

/** The colored value a project has for a field, or null when it has none or its value has no color. */
export function coloredValueOf(
  project: Pick<Project, 'fields'>,
  field: ProjectField,
): (FieldOption & { colorId: TaskColorId }) | null {
  const [value] = fieldValuesOf(project, field);
  const option = field.options?.find((item) => item.id === value);
  return option?.colorId === undefined ? null : { ...option, colorId: option.colorId };
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
  const config: RoadmapConfig = {
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
  const contingency = text(data.contingencyFormula, FORMULA_MAX);
  if (contingency) config.contingencyFormula = contingency;
  if (data.projectColors === 'free') config.projectColors = 'free';
  if (isRoadmapId(data.colorFieldId)) config.colorFieldId = data.colorFieldId;
  const closures = parseClosures(data.closures);
  if (closures.length > 0) config.closures = closures;
  const notesColor = parseDayNotesColor(data.dayNotesColorId);
  if (notesColor) config.dayNotesColorId = notesColor;
  return config;
}

/** The color of the notes of the days, as stored: a known color other than the default. */
export function parseDayNotesColor(value: unknown): TaskColorId | null {
  return typeof value === 'string' && isKnownColorId(value) && value !== DEFAULT_DAY_NOTES_COLOR
    ? value
    : null;
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

/**
 * The teams in the order of their phases, then of their positions: the order of the work, which
 * the standard arrangement of a project follows.
 */
export function teamsInPhaseOrder(config: Pick<RoadmapConfig, 'teams'>): Team[] {
  return [...config.teams].sort(
    (a, b) =>
      TEAM_PHASES.indexOf(a.phase) - TEAM_PHASES.indexOf(b.phase) ||
      a.position - b.position ||
      a.id.localeCompare(b.id),
  );
}

/**
 * The teams in the order the members gave them in the settings: the order of the table of the
 * days of a project and of the people of a project on the roadmap.
 */
export function teamsInOrder(config: Pick<RoadmapConfig, 'teams'>): Team[] {
  return sortByPosition(config.teams);
}

/**
 * Where a person falls in the order of the teams: the position of their team, then their own
 * position. A person no longer in the configuration comes last.
 */
export function workRank(
  config: Pick<RoadmapConfig, 'teams' | 'stakeholders'>,
  stakeholderId: string | undefined,
): [team: number, person: number] {
  const stakeholder = config.stakeholders.find((item) => item.id === stakeholderId);
  if (!stakeholder) return [Number.MAX_SAFE_INTEGER, 0];
  const teams = teamsInOrder(config);
  const team = teams.findIndex((item) => item.id === stakeholder.teamId);
  return [team === -1 ? teams.length : team, stakeholder.position];
}

export function compareWorkRank(
  a: [team: number, person: number],
  b: [team: number, person: number],
): number {
  return a[0] - b[0] || a[1] - b[1];
}

/** The people in the table of a new project: the default members, in the order of the teams. */
export function defaultMembers(config: RoadmapConfig): Stakeholder[] {
  return teamsInOrder(config).flatMap((team) =>
    sortByPosition(config.stakeholders.filter((item) => item.teamId === team.id && item.default)),
  );
}

/**
 * The items whose position changes when one of them moves to an index of their order, numbered
 * 0, 1, 2… along the new order; none when the item is not among them or does not move.
 */
export function movedPositions<T extends { id: string; position: number }>(
  items: readonly T[],
  id: string,
  to: number,
): T[] {
  const order = sortByPosition(items);
  const from = order.findIndex((item) => item.id === id);
  if (from === -1) return [];
  const [moved] = order.splice(from, 1);
  if (!moved) return [];
  order.splice(Math.max(0, Math.min(order.length, to)), 0, moved);
  return order.flatMap((item, index) =>
    item.position === index ? [] : [{ ...item, position: index }],
  );
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

/** A value of a field in words: dates in the chosen format, numbers with the locale, options by label. */
export function formatFieldValue(
  field: ProjectField,
  value: FieldValue,
  dateFormat: DateFormat = DEFAULT_DATE_FORMAT,
): string {
  if (typeof value === 'number') {
    return formatLocaleNumber(value, Number.isInteger(value) ? 0 : 2);
  }
  if (typeof value === 'object') {
    const decimals = Number.isInteger(value.amount) ? 0 : 2;
    return `${formatLocaleNumber(value.amount, decimals)} ${value.currency}`;
  }
  if (field.type === 'date') return formatDate(value, dateFormat);
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
