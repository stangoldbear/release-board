import { describe, expect, it } from 'vitest';
import { createBackupFile, parseBackupText, serializeBackup } from './backup';
import { nextProjectColor } from './projects';
import {
  applyRoadmapSettings,
  defaultRoadmapConfig,
  parseRoadmapConfig,
  projectColorField,
  projectColorOf,
} from './roadmapConfig';
import { buildSamplePlan } from './sample';
import { TASK_COLOR_IDS } from './colors';
import type { Project, ProjectField } from './types';

const config = defaultRoadmapConfig();
const project = (fields: Project['fields']): Pick<Project, 'colorId' | 'fields'> => ({
  colorId: 'teal',
  ...(fields ? { fields } : {}),
});

describe('the colors of the projects', () => {
  it('come from the first field with colored values, or the one chosen', () => {
    expect(projectColorField(config)?.id).toBe('projectSize');
    expect(projectColorField({ fields: [], colorFieldId: 'projectSize' })).toBeNull();
    const size = config.fields.find((field) => field.id === 'projectSize')!;
    const risk: ProjectField = {
      ...size,
      id: 'risk',
      label: 'Rischio',
      position: 99,
      options: [{ id: 'high', label: 'Alto', colorId: 'red' }],
    };
    const other = { ...config, fields: [...config.fields, risk], colorFieldId: 'risk' };
    expect(projectColorField(other)?.id).toBe('risk');
    expect(projectColorOf(project({ risk: ['high'] }), other)).toBe('red');
  });

  it('are the value of the project, grey without one, or free when the settings say so', () => {
    const big = config.fields
      .find((field) => field.id === 'projectSize')
      ?.options?.find((option) => option.label === 'Big project');
    expect(big?.colorId).toBeDefined();
    expect(projectColorOf(project({ projectSize: [big!.id] }), config)).toBe(big!.colorId);
    expect(projectColorOf(project(undefined), config)).toBe('gray');
    expect(projectColorOf(project(undefined), { ...config, projectColors: 'free' })).toBe('teal');
    expect(projectColorOf(project(undefined), { ...config, fields: [] })).toBe('teal');
  });

  it('are changed in the shared settings, with the field, and the default is not stored', () => {
    const free = applyRoadmapSettings(config, {
      projectColors: 'free',
      colorFieldId: 'projectSize',
    });
    expect(free.projectColors).toBe('free');
    expect(free.colorFieldId).toBe('projectSize');
    const back = applyRoadmapSettings(free, { projectColors: 'field', colorFieldId: null });
    expect(back.projectColors).toBeUndefined();
    expect(back.colorFieldId).toBeUndefined();
    expect(
      parseRoadmapConfig({ projectColors: 'free', colorFieldId: 'projectSize' }),
    ).toMatchObject({ projectColors: 'free', colorFieldId: 'projectSize' });
    expect(parseRoadmapConfig({ projectColors: 'rainbow', colorFieldId: 12 })).not.toHaveProperty(
      'projectColors',
    );
  });

  it('travel in a backup', () => {
    const plan = buildSamplePlan(2026, 10);
    plan.roadmap = { ...plan.roadmap, projectColors: 'free', colorFieldId: 'projectSize' };
    const text = serializeBackup(createBackupFile(plan, new Date('2026-10-12T12:00:00Z')));
    const read = parseBackupText(text);
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.plan.roadmap.projectColors).toBe('free');
      expect(read.plan.roadmap.colorFieldId).toBe('projectSize');
    }
  });

  it('give a new project the color after the last one when the colors are free', () => {
    expect(nextProjectColor([])).toBe('blue');
    const after = (color: (typeof TASK_COLOR_IDS)[number]) =>
      TASK_COLOR_IDS[(TASK_COLOR_IDS.indexOf(color) + 1) % TASK_COLOR_IDS.length];
    expect(nextProjectColor([{ colorId: 'blue' }, { colorId: 'green' }])).toBe(after('green'));
    expect(nextProjectColor([{ colorId: TASK_COLOR_IDS.at(-1)! }])).toBe(TASK_COLOR_IDS[0]);
  });
});
