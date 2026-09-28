import { describe, expect, it } from 'vitest';
import { formatDateToISO, getDaysInMonth, isWeekend, parseISODate } from '../utils/dateUtils';
import { createBackupFile, parseBackup } from './backup';
import { buildSamplePlan } from './sample';

describe('buildSamplePlan', () => {
  const plan = buildSamplePlan(2026, 1); // February: the shortest month

  it('is stable for the same month', () => {
    expect(buildSamplePlan(2026, 1)).toEqual(plan);
  });

  it('keeps every task inside the month and on an existing lane', () => {
    const laneIds = new Set(plan.lanes.map((lane) => lane.id));
    for (const task of plan.tasks) {
      expect(laneIds.has(task.laneId)).toBe(true);
      expect(task.startDate >= '2026-02-01').toBe(true);
      expect(task.endDate <= '2026-02-28').toBe(true);
      expect(task.endDate >= task.startDate).toBe(true);
    }
  });

  it('has metric values on weekdays only', () => {
    const weekdays = getDaysInMonth(2026, 1)
      .filter((date) => !isWeekend(date))
      .map(formatDateToISO);
    expect(plan.metrics.map((metric) => metric.date)).toEqual(weekdays);
    expect(plan.metrics.every((metric) => !isWeekend(parseISODate(metric.date)))).toBe(true);
  });

  it('survives a backup round trip', () => {
    const result = parseBackup(createBackupFile(plan, new Date('2026-02-10T09:00:00Z')));
    expect(result).toMatchObject({ ok: true, plan });
  });
});
