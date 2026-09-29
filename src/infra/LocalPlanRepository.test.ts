import { describe, expect, it } from 'vitest';
import { createBackupFile, serializeBackup } from '../domain/backup';
import { createEmptyPlan } from '../domain/plan';
import { buildSamplePlan } from '../domain/sample';
import type { PlanSnapshot, TaskItem } from '../domain/types';
import { LocalPlanRepository, PLAN_STORAGE_KEY } from './LocalPlanRepository';

class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

const NOW = new Date('2026-09-29T08:00:00Z');

function setup(storage: Storage | null = new MemoryStorage(), events = new EventTarget()) {
  let nextId = 0;
  const repository = new LocalPlanRepository({
    storage,
    events,
    now: () => NOW,
    createId: () => `id-${++nextId}`,
  });
  const received: PlanSnapshot[] = [];
  const stop = repository.subscribe((plan) => received.push(plan));
  return { repository, storage, events, received, stop, latest: () => received.at(-1)! };
}

const content: Omit<TaskItem, 'id'> = {
  title: 'Collaudo',
  laneId: 'lane-1',
  startDate: '2026-09-10',
  endDate: '2026-09-12',
  colorId: 'ice',
  borderStyle: 'dashed',
  status: 'planned',
};

describe('LocalPlanRepository', () => {
  it('starts from an empty plan and delivers it right away', () => {
    const { repository, received } = setup();
    expect(received).toEqual([createEmptyPlan()]);
    expect(repository.loadWarning).toBeNull();
  });

  it('saves every change and reads it back in a new session', () => {
    const { repository, storage, latest } = setup();
    const id = repository.createTask(content);
    repository.updateTask(id, { status: 'in_progress' });
    repository.setNote('2026-09-15', 'Congelamento');
    repository.setMetricValues([{ date: '2026-09-10', value: 1200 }]);

    expect(id).toBe('id-1');
    expect(latest().tasks).toEqual([{ ...content, id, status: 'in_progress' }]);

    const reopened = setup(storage);
    expect(reopened.latest()).toEqual(latest());
  });

  it('deletes tasks and replaces the whole plan', () => {
    const { repository, latest } = setup();
    const id = repository.createTask(content);
    repository.deleteTask(id);
    expect(latest().tasks).toEqual([]);

    const sample = buildSamplePlan(2026, 8);
    repository.replacePlan(sample);
    expect(latest()).toEqual(sample);
  });

  it('stops calling a listener after it unsubscribes', () => {
    const { repository, received, stop } = setup();
    stop();
    repository.createTask(content);
    expect(received).toHaveLength(1);
  });

  it('picks up the changes saved by another tab', () => {
    const storage = new MemoryStorage();
    const events = new EventTarget();
    const first = setup(storage, events);
    const second = setup(storage, events);

    second.repository.createTask(content);
    events.dispatchEvent(Object.assign(new Event('storage'), { key: PLAN_STORAGE_KEY }));

    expect(first.latest().tasks).toHaveLength(1);
    // The next change of the first tab builds on the version of the second one.
    first.repository.setNote('2026-09-15', 'Nota');
    expect(first.latest().tasks).toHaveLength(1);
  });

  it('ignores storage events about other keys', () => {
    const { events, received } = setup();
    events.dispatchEvent(Object.assign(new Event('storage'), { key: 'altro' }));
    expect(received).toHaveLength(1);
  });

  it('keeps an unreadable saved plan under another key and starts empty', () => {
    const storage = new MemoryStorage();
    storage.setItem(PLAN_STORAGE_KEY, '{ non è JSON');
    const { repository, latest } = setup(storage);

    expect(repository.loadWarning).toMatch(/non erano leggibili/);
    expect(latest()).toEqual(createEmptyPlan());
    expect(storage.getItem(`${PLAN_STORAGE_KEY}:non-leggibile:${NOW.getTime()}`)).toBe(
      '{ non è JSON',
    );
    // Moved, not copied: the next session does not warn again.
    expect(setup(storage).repository.loadWarning).toBeNull();
  });

  it('reads a plan saved by the previous version of the app', () => {
    const storage = new MemoryStorage();
    const sample = buildSamplePlan(2026, 8);
    storage.setItem(PLAN_STORAGE_KEY, serializeBackup(createBackupFile(sample, NOW)));
    expect(setup(storage).latest()).toEqual(sample);
  });

  it('works in memory when the browser does not allow storage', () => {
    const { repository, latest } = setup(null);
    expect(repository.loadWarning).toMatch(/non consente/);
    repository.createTask(content);
    expect(latest().tasks).toHaveLength(1);
  });
});
