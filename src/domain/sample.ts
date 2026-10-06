import type { TaskColorId } from './colors';
import type {
  BorderStyle,
  DailyMetric,
  Memo,
  PlanSnapshot,
  Project,
  ProjectStatus,
  TaskItem,
  TaskStatus,
} from './types';
import { formatDateToISO, getDaysInMonth, isWeekend } from '../utils/dateUtils';
import { DEFAULT_LANES } from './plan';

interface SampleTask {
  title: string;
  laneId: string;
  /** Day of the month the task starts on. */
  day: number;
  /** Duration in days, inclusive. */
  days: number;
  colorId: TaskColorId;
  status: TaskStatus;
  borderStyle: BorderStyle;
  assignee?: string;
}

const SAMPLE_TASKS: SampleTask[] = [
  {
    title: 'Avvio versione 2.8',
    laneId: 'lane-1',
    day: 1,
    days: 1,
    colorId: 'gray',
    status: 'completed',
    borderStyle: 'solid',
  },
  {
    title: 'Nuovo carrello',
    laneId: 'lane-1',
    day: 2,
    days: 7,
    colorId: 'blue',
    status: 'in_progress',
    borderStyle: 'dashed',
    assignee: 'Giulia',
  },
  {
    title: 'API ordini',
    laneId: 'lane-2',
    day: 3,
    days: 6,
    colorId: 'yellow',
    status: 'in_progress',
    borderStyle: 'dashed',
    assignee: 'Marco',
  },
  {
    title: 'Calendario editoriale',
    laneId: 'lane-3',
    day: 5,
    days: 9,
    colorId: 'purple',
    status: 'in_progress',
    borderStyle: 'dashed',
    assignee: 'Sara',
  },
  {
    title: 'Migrazione database',
    laneId: 'lane-2',
    day: 10,
    days: 2,
    colorId: 'yellow',
    status: 'planned',
    borderStyle: 'dashed',
  },
  {
    title: 'Collaudo',
    laneId: 'lane-2',
    day: 12,
    days: 3,
    colorId: 'ice',
    status: 'planned',
    borderStyle: 'dashed',
  },
  {
    title: 'Rilascio in produzione',
    laneId: 'lane-2',
    day: 16,
    days: 1,
    colorId: 'green',
    status: 'planned',
    borderStyle: 'solid',
  },
  {
    title: 'Pubblicazione sugli store',
    laneId: 'lane-1',
    day: 17,
    days: 2,
    colorId: 'gray',
    status: 'planned',
    borderStyle: 'dashed',
  },
  {
    title: 'Newsletter clienti',
    laneId: 'lane-3',
    day: 19,
    days: 1,
    colorId: 'indigo',
    status: 'planned',
    borderStyle: 'dashed',
  },
  {
    title: 'Correzione pagamenti',
    laneId: 'lane-2',
    day: 22,
    days: 1,
    colorId: 'red',
    status: 'blocked',
    borderStyle: 'solid',
  },
  {
    title: 'Retrospettiva',
    laneId: 'lane-1',
    day: 24,
    days: 1,
    colorId: 'gray',
    status: 'planned',
    borderStyle: 'dashed',
  },
];

/** Invented promotions, by days of the month. */
const SAMPLE_PROMOS: { from: number; to: number; eu?: string; nonEu?: string }[] = [
  { from: 12, to: 16, eu: 'Settimana del cliente', nonEu: 'Spedizione gratuita' },
  { from: 26, to: 28, eu: 'Saldi di fine mese' },
];

const SAMPLE_NOTES: { day: number; text: string }[] = [
  { day: 1, text: 'Inizio lavori sulla versione 2.8' },
  { day: 15, text: 'Congelamento del codice alle 12:00' },
];

/** Free notes: one with a text, one with a reminder on a day of the month, one plain. */
const SAMPLE_MEMOS: { title: string; body?: string; colorId?: TaskColorId; remindDay?: number }[] =
  [
    {
      title: 'App mobile: rilascio a gennaio',
      body: 'Prima la beta interna, poi la revisione degli store.',
      colorId: 'blue',
    },
    // In the next month: a sample loaded after the 20th would greet with a reminder at once.
    { title: 'Fornitore dei pagamenti: stima entro il 20', colorId: 'yellow', remindDay: 20 },
    { title: 'Preparare le note di rilascio della 2.8' },
  ];

/** Projects of the roadmap: one concluded, two running, two to come; months from the given one. */
const SAMPLE_PROJECTS: {
  title: string;
  from: [month: number, day: number];
  to: [month: number, day: number];
  colorId: TaskColorId;
  status: ProjectStatus;
  owner?: string;
  description?: string;
}[] = [
  {
    title: 'Nuovo sito vetrina',
    from: [-5, 1],
    to: [-2, 15],
    colorId: 'blue',
    status: 'completed',
    owner: 'Sara',
  },
  {
    title: 'App mobile 3.0',
    from: [-1, 10],
    to: [2, 28],
    colorId: 'purple',
    status: 'in_progress',
    owner: 'Giulia',
    description: 'Nuovo carrello, pagamenti in un tocco e notifiche degli ordini.',
  },
  {
    title: 'Migrazione al cloud',
    from: [0, 1],
    to: [5, 30],
    colorId: 'green',
    status: 'in_progress',
    owner: 'Marco',
    description: 'Database e servizi degli ordini, un servizio alla volta.',
  },
  {
    title: 'Programma fedeltà',
    from: [3, 1],
    to: [7, 31],
    colorId: 'yellow',
    status: 'planned',
  },
  {
    title: 'Nuovo magazzino',
    from: [6, 1],
    to: [11, 30],
    colorId: 'gray',
    status: 'idea',
  },
];

/** The last day of a month, which may be before or after the given year. */
function lastDay(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * An invented plan for the given month, used to try the app. The result depends only on
 * year and month, so it is stable across runs and in tests.
 */
export function buildSamplePlan(year: number, month: number): PlanSnapshot {
  const lanes = DEFAULT_LANES.map((lane) => ({ ...lane }));
  const dateOf = (day: number) => formatDateToISO(new Date(year, month, day));

  const tasks: TaskItem[] = SAMPLE_TASKS.map((sample, index) => {
    const task: TaskItem = {
      id: `sample-${index + 1}`,
      title: sample.title,
      laneId: sample.laneId,
      startDate: dateOf(sample.day),
      endDate: dateOf(sample.day + sample.days - 1),
      colorId: sample.colorId,
      borderStyle: sample.borderStyle,
      status: sample.status,
    };
    if (sample.assignee) task.assignee = sample.assignee;
    return task;
  });

  // Plausible weekday values: a base amount with a deterministic variation per day. The busiest
  // days are the most delicate for releases, as in a revenue forecast.
  const metrics: DailyMetric[] = getDaysInMonth(year, month)
    .filter((date) => !isWeekend(date))
    .map((date) => {
      const value = 90_000 + ((date.getDate() * 7_919) % 45_000);
      const metric: DailyMetric = {
        date: formatDateToISO(date),
        value,
        approval: value >= 125_000 ? 'red' : value >= 110_000 ? 'orange' : 'green',
      };
      const promo = SAMPLE_PROMOS.find(
        ({ from, to }) => from <= date.getDate() && date.getDate() <= to,
      );
      if (promo?.eu) metric.promoEu = promo.eu;
      if (promo?.nonEu) metric.promoNonEu = promo.nonEu;
      return metric;
    });

  const dailyNotes = Object.fromEntries(SAMPLE_NOTES.map((note) => [dateOf(note.day), note.text]));

  const memos: Memo[] = SAMPLE_MEMOS.map((sample, index) => {
    const memo: Memo = { id: `sample-memo-${index + 1}`, title: sample.title, position: index + 1 };
    if (sample.body) memo.body = sample.body;
    if (sample.colorId) memo.colorId = sample.colorId;
    if (sample.remindDay) {
      memo.remindOn = formatDateToISO(new Date(year, month + 1, sample.remindDay));
    }
    return memo;
  });

  // Days past the end of a month go to the last one: 31 of a month of 30 is the 30th.
  const dayIn = ([offset, day]: [number, number]) =>
    formatDateToISO(new Date(year, month + offset, Math.min(day, lastDay(year, month + offset))));
  const projects: Project[] = SAMPLE_PROJECTS.map((sample, index) => {
    const project: Project = {
      id: `sample-project-${index + 1}`,
      title: sample.title,
      startDate: dayIn(sample.from),
      endDate: dayIn(sample.to),
      colorId: sample.colorId,
      status: sample.status,
    };
    if (sample.owner) project.owner = sample.owner;
    if (sample.description) project.description = sample.description;
    return project;
  });

  return { lanes, tasks, metrics, dailyNotes, memos, projects };
}
