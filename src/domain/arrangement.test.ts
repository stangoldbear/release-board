import { describe, expect, it } from 'vitest';
import { arrangeProject, firstWorkingDayFrom, nextWorkingDay } from './arrangement';
import { defaultRoadmapConfig } from './roadmapConfig';

const config = defaultRoadmapConfig();

// 2 November 2026 is a Monday.
const bars = [
  { id: 'ba', stakeholderId: 'ba-1', manDays: 5, startDate: '2026-11-02' },
  { id: 'server', stakeholderId: 'server-1', manDays: 12, startDate: '2026-11-02' },
  { id: 'ios', stakeholderId: 'ios-1', manDays: 8, startDate: '2026-11-02' },
  { id: 'android', stakeholderId: 'android-1', manDays: 10, startDate: '2026-11-02' },
  { id: 'qa', stakeholderId: 'qa-1', manDays: 3.5, startDate: '2026-11-02' },
];

describe('working days', () => {
  it('skip weekends and holidays', () => {
    expect(firstWorkingDayFrom('2026-11-02')).toBe('2026-11-02');
    expect(firstWorkingDayFrom('2026-11-07')).toBe('2026-11-09');
    expect(nextWorkingDay('2026-11-06')).toBe('2026-11-09');
    expect(nextWorkingDay('2026-12-07')).toBe('2026-12-09'); // the 8th is a holiday
  });
});

describe('the arrangement of a project', () => {
  it('puts the analysis first, the developments in parallel, the tests and the contingency after', () => {
    const arranged = arrangeProject({ startDate: '2026-11-01' }, bars, 3, config);
    expect(arranged.starts).toEqual({
      ba: '2026-11-02',
      server: '2026-11-09',
      ios: '2026-11-09',
      android: '2026-11-09',
      qa: '2026-11-25',
    });
    // QA takes four days from Wednesday the 25th: the contingency follows on Tuesday 1 December.
    expect(arranged.contingencyStart).toBe('2026-12-01');
  });

  it('skips the phases without bars and the contingency without days', () => {
    const noAnalysis = bars.filter((bar) => bar.id !== 'ba');
    const arranged = arrangeProject({ startDate: '2026-11-02' }, noAnalysis, null, config);
    expect(arranged.starts.server).toBe('2026-11-02');
    expect(arranged.starts.qa).toBe('2026-11-18');
    expect(arranged.contingencyStart).toBeNull();
    expect(arrangeProject({ startDate: '2026-11-02' }, [], 2, config)).toEqual({
      starts: {},
      contingencyStart: '2026-11-02',
    });
  });

  it('starts everyone together in parallel, and one after another in sequence', () => {
    const parallel = arrangeProject(
      { startDate: '2026-11-02', arrangement: 'parallel' },
      bars,
      3,
      config,
    );
    expect(new Set(Object.values(parallel.starts))).toEqual(new Set(['2026-11-02']));
    expect(parallel.contingencyStart).toBe('2026-11-18');
    const sequence = arrangeProject(
      { startDate: '2026-11-02', arrangement: 'sequence' },
      bars,
      1,
      config,
    );
    expect(sequence.starts).toEqual({
      ba: '2026-11-02',
      server: '2026-11-09',
      ios: '2026-11-25',
      android: '2026-12-07',
      // Christmas, Saint Stephen's day and the weekend: four days of QA end on the 28th.
      qa: '2026-12-22',
    });
    expect(sequence.contingencyStart).toBe('2026-12-29');
  });

  it('leaves the bars where they are by hand, the contingency after the last one', () => {
    const moved = bars.map((bar, index) => ({ ...bar, startDate: `2026-11-${10 + index}` }));
    const manual = arrangeProject(
      { startDate: '2026-11-02', arrangement: 'manual' },
      moved,
      2,
      config,
    );
    expect(manual.starts.ba).toBe('2026-11-10');
    expect(manual.starts.qa).toBe('2026-11-14');
    // Server #1 works twelve days from the 11th and ends on the 26th: the reserve follows.
    expect(manual.contingencyStart).toBe('2026-11-27');
  });

  it('places people of unknown teams with the developments', () => {
    const stranger = [{ id: 'x', stakeholderId: 'nobody', manDays: 2, startDate: '2026-11-02' }];
    expect(
      arrangeProject({ startDate: '2026-11-02' }, [...bars, ...stranger], null, config).starts.x,
    ).toBe('2026-11-09');
  });
});
