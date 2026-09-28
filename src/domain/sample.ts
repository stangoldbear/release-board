import type { BorderStyle, DailyMetric, PlanSnapshot, TaskItem, TaskStatus } from '../types';
import { formatDateToISO, getDaysInMonth, isWeekend } from '../utils/dateUtils';
import { DEFAULT_LANES } from './plan';

interface SampleTask {
  title: string;
  lane: number;
  /** Day of the month the task starts on. */
  day: number;
  /** Duration in days, inclusive. */
  days: number;
  colorId: string;
  status: TaskStatus;
  borderStyle: BorderStyle;
  assignee?: string;
}

const SAMPLE_TASKS: SampleTask[] = [
  {
    title: 'Avvio versione 2.8',
    lane: 0,
    day: 1,
    days: 1,
    colorId: 'gray',
    status: 'completed',
    borderStyle: 'solid',
  },
  {
    title: 'Nuovo carrello',
    lane: 0,
    day: 2,
    days: 7,
    colorId: 'blue',
    status: 'in_progress',
    borderStyle: 'dashed',
    assignee: 'Giulia',
  },
  {
    title: 'API ordini',
    lane: 1,
    day: 3,
    days: 6,
    colorId: 'yellow',
    status: 'in_progress',
    borderStyle: 'dashed',
    assignee: 'Marco',
  },
  {
    title: 'Calendario editoriale',
    lane: 2,
    day: 5,
    days: 9,
    colorId: 'purple',
    status: 'in_progress',
    borderStyle: 'dashed',
    assignee: 'Sara',
  },
  {
    title: 'Migrazione database',
    lane: 1,
    day: 10,
    days: 2,
    colorId: 'yellow',
    status: 'planned',
    borderStyle: 'dashed',
  },
  {
    title: 'Collaudo',
    lane: 1,
    day: 12,
    days: 3,
    colorId: 'ice',
    status: 'planned',
    borderStyle: 'dashed',
  },
  {
    title: 'Rilascio in produzione',
    lane: 1,
    day: 16,
    days: 1,
    colorId: 'green',
    status: 'planned',
    borderStyle: 'solid',
  },
  {
    title: 'Pubblicazione sugli store',
    lane: 0,
    day: 17,
    days: 2,
    colorId: 'gray',
    status: 'planned',
    borderStyle: 'dashed',
  },
  {
    title: 'Newsletter clienti',
    lane: 2,
    day: 19,
    days: 1,
    colorId: 'indigo',
    status: 'planned',
    borderStyle: 'dashed',
  },
  {
    title: 'Correzione pagamenti',
    lane: 1,
    day: 22,
    days: 1,
    colorId: 'red',
    status: 'blocked',
    borderStyle: 'solid',
  },
  {
    title: 'Retrospettiva',
    lane: 0,
    day: 24,
    days: 1,
    colorId: 'gray',
    status: 'planned',
    borderStyle: 'dashed',
  },
];

const SAMPLE_NOTES: { day: number; text: string }[] = [
  { day: 1, text: 'Inizio lavori sulla versione 2.8' },
  { day: 15, text: 'Congelamento del codice alle 12:00' },
];

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
      laneId: lanes[sample.lane].id,
      startDate: dateOf(sample.day),
      endDate: dateOf(sample.day + sample.days - 1),
      colorId: sample.colorId,
      borderStyle: sample.borderStyle,
      status: sample.status,
    };
    if (sample.assignee) task.assignee = sample.assignee;
    return task;
  });

  // Plausible weekday values: a base amount with a deterministic variation per day.
  const metrics: DailyMetric[] = getDaysInMonth(year, month)
    .filter((date) => !isWeekend(date))
    .map((date) => ({
      date: formatDateToISO(date),
      value: 90_000 + ((date.getDate() * 7_919) % 45_000),
    }));

  const dailyNotes = Object.fromEntries(SAMPLE_NOTES.map((note) => [dateOf(note.day), note.text]));

  return { lanes, tasks, metrics, dailyNotes };
}
