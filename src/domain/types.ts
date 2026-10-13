import type { TaskColorId } from './colors';

export type TaskStatus = 'planned' | 'in_progress' | 'review' | 'completed' | 'blocked';

export type BorderStyle = 'dashed' | 'solid';

export interface TaskItem {
  id: string;
  title: string;
  laneId: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD, inclusive */
  endDate: string;
  colorId: TaskColorId;
  borderStyle: BorderStyle;
  status: TaskStatus;
  assignee?: string;
  description?: string;
  deliverables?: string[];
}

export interface Lane {
  id: string;
  name: string;
}

/**
 * How freely work can be released on a day, from the revenue forecast: green without limits, red
 * only with the approval of several stakeholders.
 */
export type ApprovalLight = 'green' | 'orange' | 'red';

export interface DailyMetric {
  /** YYYY-MM-DD */
  date: string;
  value: number;
  /** From an imported revenue forecast, with the promotions running on the day. */
  approval?: ApprovalLight;
  promoEu?: string;
  promoNonEu?: string;
}

/** Note text by date (YYYY-MM-DD). */
export type DailyNotes = Record<string, string>;

/** Who wrote a free note in a shared instance: GitHub id and username. */
export interface MemoAuthor {
  id: string;
  login: string;
}

/** A free note, in the strip under the search: about anything, not tied to a day. */
export interface Memo {
  id: string;
  title: string;
  body?: string;
  colorId?: TaskColorId;
  /** YYYY-MM-DD: from this day on, opening the calendar shows a reminder of the note. */
  remindOn?: string;
  /** Order in the strip, lowest first; fractional, so that a move changes one note only. */
  position: number;
  /** In a shared instance; the notes of the local mode have no author. */
  author?: MemoAuthor;
  /** Seen by its author only; absent on the notes that every member sees. */
  private?: true;
}

/** How far a project of the roadmap has come. */
export type ProjectStatus = 'idea' | 'planned' | 'in_progress' | 'completed' | 'on_hold';

/** What a custom field of the projects holds. */
export type FieldType = 'text' | 'textarea' | 'number' | 'price' | 'url' | 'date' | 'choice';

/** One of the values a choice field offers. */
export interface FieldOption {
  id: string;
  label: string;
  /** The color of the value's tag: a task color, readable in every theme. None: a neutral tag. */
  colorId?: TaskColorId;
}

/** A custom field of the projects, as Settings → Roadmap defines it. */
export interface ProjectField {
  id: string;
  label: string;
  /** What the field is for, in a line under its label. */
  description?: string;
  type: FieldType;
  /** Holds a list of values: several links, texts or choices (additive rather than exclusive). */
  multiple: boolean;
  /** At least one value is expected. */
  required: boolean;
  /** Shown under the title of the project at the "Info principali" level of the roadmap. */
  main: boolean;
  /**
   * The roadmap can group the projects by the value of this field. Only a choice with one value
   * groups: each project then belongs to one group. Kept only when true.
   */
  group?: true;
  /** In the standard view of the window of a project, among the few fields it shows. Kept only when true. */
  quick?: true;
  /** Choice fields: the values to choose from, in order. */
  options?: FieldOption[];
  /** Order among the fields. */
  position: number;
}

/** An amount of money with its currency code, such as EUR. */
export interface Price {
  amount: number;
  currency: string;
}

/**
 * One value of a custom field: texts, links and dates as strings, numbers, prices, or the id of
 * an option for a choice field.
 */
export type FieldValue = string | number | Price;

/** The values of the custom fields of a project, by field id: a list even when the value is one. */
export type ProjectFieldValues = Record<string, FieldValue[]>;

/**
 * How the bars of the work of a project are laid out: the analysis from the start, then the
 * developments in parallel, then the tests, then the contingency; all from the start; one after
 * another; or where they were moved by hand.
 */
export type ProjectArrangement = 'standard' | 'parallel' | 'sequence' | 'manual';

/** The reserve at the end of a project: a bar of the project itself, with no person. */
export interface ProjectContingency {
  /** YYYY-MM-DD: the first day; the reserve starts on the first working day from there. */
  startDate: string;
  /** Working days of reserve. */
  manDays: number;
}

/**
 * A project of the roadmap, past, current or future: one row, with a bar from its start to the
 * end of the work of its team, and a deadline when it has one.
 */
export interface Project {
  id: string;
  title: string;
  /**
   * YYYY-MM-DD: the day the work of the team starts. The project ends with the last day of that
   * work (versions before 0.16 also had a planned end and days of their own: they are ignored).
   */
  startDate: string;
  /** YYYY-MM-DD: the project must be online by this day; the roadmap warns where the work goes past it. */
  deadline?: string;
  /** An alert so many days before the deadline, or the end of the work: 0 is the day itself. */
  remindDaysBefore?: number;
  contingency?: ProjectContingency;
  /** Absent: standard. */
  arrangement?: ProjectArrangement;
  colorId: TaskColorId;
  status: ProjectStatus;
  /** Who leads it. */
  owner?: string;
  description?: string;
  /** The values of the custom fields; absent when none is set. */
  fields?: ProjectFieldValues;
  /**
   * Where the project stands in the order the members gave, a fraction so that a move changes one
   * project; absent for a project never moved, which comes after the others.
   */
  position?: number;
}

/** Whether a note of a project can be ticked off, and whether it has been. Absent: no state. */
export type ProjectNoteStatus = 'open' | 'done';

/**
 * A note written on a project along the way: feasibility, estimates, analysis, development,
 * release. It says who wrote it and when, and can carry a state, a deadline, owners and tags.
 */
export interface ProjectNote {
  id: string;
  projectId: string;
  text: string;
  /** When it was written, ISO 8601 with the time, from the clock of who wrote it. */
  createdAt: string;
  /** In a shared instance; the notes of the local mode have no author. */
  author?: MemoAuthor;
  status?: ProjectNoteStatus;
  /** YYYY-MM-DD: when what the note says is due. */
  dueOn?: string;
  /** From the due day on, the app shows an alert for the note until it is done or dismissed. */
  remind?: true;
  /** Who takes care of what the note says. */
  owners?: string[];
  tags?: string[];
}

/**
 * Where the work of a team falls in the standard arrangement of a project: the analysis first,
 * the developments in parallel after it, the tests after the last development.
 */
export type TeamPhase = 'analysis' | 'development' | 'test';

/** A team of the people who work on the projects, with its color and its short tag. */
export interface Team {
  id: string;
  name: string;
  /** Short name on bars and chips, such as "iOSDev"; the formulas name the teams by it. */
  tag: string;
  colorId: TaskColorId;
  phase: TeamPhase;
  /**
   * How many days the team takes on a project, from the days of the other teams, as
   * "0.12*(ServerSide+iOSDev+AndDev)"; the window of a new project fills them in from it.
   */
  formula?: string;
  /** Order among the teams. */
  position: number;
}

/** Days someone is away, both ends included. */
export interface Absence {
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD, inclusive */
  end: string;
  reason?: string;
}

/**
 * Days the whole company is closed, both ends included: nobody works, as on a weekend, and the
 * timeline shows them striped in red.
 */
export interface Closure {
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD, inclusive */
  end: string;
  reason?: string;
}

/**
 * Someone who works on the projects: a person, or a seat such as "Server #1", in a team. Their
 * assignments skip the days they are away, and show them hatched.
 */
export interface Stakeholder {
  id: string;
  name: string;
  teamId: string;
  info?: string;
  absences: Absence[];
  /** In the table of the days of every new project from the start. Kept only when true. */
  default?: true;
  /** Order within the team. */
  position: number;
}

/** The work of a stakeholder on a project: from a day on, for some days of effort. */
export interface Assignment {
  id: string;
  projectId: string;
  stakeholderId: string;
  /** YYYY-MM-DD: the first day; the work starts on the first working day from there. */
  startDate: string;
  /** The effort, in working days of one person. */
  manDays: number;
  note?: string;
}

/**
 * How the projects are described: the custom fields, the teams and the people who work on them,
 * and the shared settings of the roadmap.
 */
/** Where the color of a project comes from: a field with colored values, or the project itself. */
export type ProjectColorsMode = 'field' | 'free';

export interface RoadmapConfig {
  fields: ProjectField[];
  teams: Team[];
  stakeholders: Stakeholder[];
  /**
   * The colors of the projects on the roadmap: from the values of a field with colors, the one in
   * `colorFieldId` or the first that has them, or chosen project by project. Absent means from
   * the field.
   */
  projectColors?: ProjectColorsMode;
  colorFieldId?: string;
  /**
   * The days of contingency of a project, from the days of the teams, as a formula on their tags:
   * the contingency is a bar of the project, not of a person.
   */
  contingencyFormula?: string;
  /** The company closures, by start; absent when there are none. */
  closures?: Closure[];
}

/**
 * A note on a day of the roadmap: a diamond on the row of its project, or on the row of the notes
 * at the top when it belongs to no project.
 */
export interface Milestone {
  id: string;
  /** YYYY-MM-DD. */
  date: string;
  title: string;
  body?: string;
  colorId: TaskColorId;
  /** The project it belongs to; absent for a note of no project. */
  projectId?: string;
  /** An alert the day of the note, once per browser. */
  remind?: true;
}

/** Everything that makes up a plan: what is saved, exported and restored. */
export interface PlanSnapshot {
  lanes: Lane[];
  tasks: TaskItem[];
  metrics: DailyMetric[];
  dailyNotes: DailyNotes;
  /** In the order of the strip. */
  memos: Memo[];
  /** The roadmap, in the order of its rows. */
  projects: Project[];
  /** The notes of the projects, oldest first. */
  projectNotes: ProjectNote[];
  /** Who works on which project, by start. */
  assignments: Assignment[];
  milestones: Milestone[];
  roadmap: RoadmapConfig;
}

/** Calendar rows the user chose to hide. New lanes are visible by default. */
export interface RowVisibility {
  hiddenLaneIds: string[];
  showNotes: boolean;
}
