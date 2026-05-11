import { describe, it, expect } from 'vitest';
import {
  collectDueItems,
  daysUntilDue,
  groupTodayByPlant,
  nextDueDate,
  todayIso,
} from './schedule';
import { ALL_MONTHS, type Plant } from '../types';
import { format } from 'date-fns';

function plant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    name: 'Test Plant',
    schedules: {},
    lastDone: {},
    ...overrides,
  };
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

describe('todayIso', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('nextDueDate', () => {
  const today = new Date(2026, 4, 10); // 2026-05-10

  it('returns null when no rules for the task', () => {
    const p = plant();
    expect(nextDueDate(p, 'water', today)).toBeNull();
  });

  it('returns null when rules exist but have no active months', () => {
    const p = plant({ schedules: { water: [{ intervalDays: 7, activeMonths: [] }] } });
    expect(nextDueDate(p, 'water', today)).toBeNull();
  });

  it('returns today when the task has never been done', () => {
    const p = plant({ schedules: { water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }] } });
    expect(iso(nextDueDate(p, 'water', today)!)).toBe('2026-05-10');
  });

  it('returns lastDone + intervalDays for the rule active during the lastDone month', () => {
    const p = plant({
      schedules: { water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }] },
      lastDone: { water: '2026-05-03' },
    });
    expect(iso(nextDueDate(p, 'water', today)!)).toBe('2026-05-10');
  });

  it('uses the month of lastDone to pick the seasonal rule', () => {
    const p = plant({
      schedules: {
        fertilize: [
          { intervalDays: 14, activeMonths: [4, 5, 6, 7, 8, 9] }, // Apr-Sep, every 14d
          { intervalDays: 30, activeMonths: [10, 11] }, // Oct-Nov, every 30d
        ],
      },
      lastDone: { fertilize: '2026-05-01' },
    });
    // May is in Apr-Sep rule, so 2026-05-01 + 14d = 2026-05-15
    expect(iso(nextDueDate(p, 'fertilize', today)!)).toBe('2026-05-15');
  });

  it('skips forward to the first day of the next active month when candidate lands in an inactive month', () => {
    const p = plant({
      schedules: {
        fertilize: [{ intervalDays: 14, activeMonths: [4, 5, 6, 7, 8, 9] }],
      },
      lastDone: { fertilize: '2026-09-25' },
    });
    // 2026-09-25 + 14d = 2026-10-09, October inactive → skip to Apr 1 next year
    expect(iso(nextDueDate(p, 'fertilize', new Date(2026, 9, 15))!)).toBe('2027-04-01');
  });

  it('falls back to lastDone (then skip-forward) when no rule covers the lastDone month', () => {
    const p = plant({
      schedules: {
        fertilize: [{ intervalDays: 14, activeMonths: [4, 5, 6, 7, 8, 9] }],
      },
      lastDone: { fertilize: '2026-12-15' },
    });
    // December has no covering rule → candidate=lastDone, then skip to Apr 1 next year
    expect(iso(nextDueDate(p, 'fertilize', new Date(2027, 0, 1))!)).toBe('2027-04-01');
  });
});

describe('daysUntilDue', () => {
  const today = new Date(2026, 4, 10);

  it('returns negative when overdue', () => {
    const p = plant({
      schedules: { water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }] },
      lastDone: { water: '2026-05-01' }, // due 2026-05-08, today is 2026-05-10
    });
    expect(daysUntilDue(p, 'water', today)).toBe(-2);
  });

  it('returns 0 when due today', () => {
    const p = plant({
      schedules: { water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }] },
      lastDone: { water: '2026-05-03' },
    });
    expect(daysUntilDue(p, 'water', today)).toBe(0);
  });

  it('returns positive when upcoming', () => {
    const p = plant({
      schedules: { water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }] },
      lastDone: { water: '2026-05-08' }, // due 2026-05-15
    });
    expect(daysUntilDue(p, 'water', today)).toBe(5);
  });

  it('returns null when no rules', () => {
    expect(daysUntilDue(plant(), 'water', today)).toBeNull();
  });
});

describe('collectDueItems', () => {
  const today = new Date(2026, 4, 10);

  it('only includes tasks whose due date is within withinDays of today', () => {
    const plants: Plant[] = [
      plant({
        id: 'a',
        name: 'A',
        schedules: { water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }] },
        lastDone: { water: '2026-05-03' }, // due today
      }),
      plant({
        id: 'b',
        name: 'B',
        schedules: { water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }] },
        lastDone: { water: '2026-05-20' }, // due far in future
      }),
    ];
    const items = collectDueItems(plants, today, 3);
    expect(items.map((i) => i.plant.id)).toEqual(['a']);
  });

  it('sorts by daysUntilDue asc, then plant name, then TASK_TYPES order', () => {
    const plants: Plant[] = [
      plant({
        id: 'a',
        name: 'Zinnia',
        schedules: {
          water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }],
          mist: [{ intervalDays: 7, activeMonths: ALL_MONTHS }],
        },
        lastDone: { water: '2026-05-03', mist: '2026-05-03' }, // both due today
      }),
      plant({
        id: 'b',
        name: 'Aloe',
        schedules: {
          water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }],
        },
        lastDone: { water: '2026-05-01' }, // overdue (-2)
      }),
    ];
    const items = collectDueItems(plants, today, 7);
    expect(items.map((i) => `${i.plant.name}-${i.taskType}`)).toEqual([
      'Aloe-water', // -2d (most overdue)
      'Zinnia-water', // 0d, name tiebreak by TASK_TYPES order (water before mist)
      'Zinnia-mist',
    ]);
  });

  it('returns an empty array when nothing is due in window', () => {
    const plants: Plant[] = [
      plant({
        schedules: { water: [{ intervalDays: 30, activeMonths: ALL_MONTHS }] },
        lastDone: { water: '2026-05-08' }, // due 2026-06-07
      }),
    ];
    expect(collectDueItems(plants, today, 7)).toEqual([]);
  });
});

describe('groupTodayByPlant', () => {
  const today = new Date(2026, 4, 10);

  it('only groups items with daysUntilDue <= 0', () => {
    const plants: Plant[] = [
      plant({
        id: 'a',
        name: 'A',
        schedules: {
          water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }],
          mist: [{ intervalDays: 7, activeMonths: ALL_MONTHS }],
        },
        lastDone: { water: '2026-05-03', mist: '2026-05-08' }, // water due today, mist due in 5d
      }),
    ];
    const items = collectDueItems(plants, today, 7);
    const groups = groupTodayByPlant(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].tasks.map((t) => t.taskType)).toEqual(['water']);
  });

  it('sorts groups by mostUrgentDays, then plant name', () => {
    const plants: Plant[] = [
      plant({
        id: 'a',
        name: 'Zinnia',
        schedules: { water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }] },
        lastDone: { water: '2026-05-03' }, // due today (0)
      }),
      plant({
        id: 'b',
        name: 'Aloe',
        schedules: { water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }] },
        lastDone: { water: '2026-05-01' }, // overdue (-2)
      }),
      plant({
        id: 'c',
        name: 'Basil',
        schedules: { water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }] },
        lastDone: { water: '2026-05-03' }, // due today (0)
      }),
    ];
    const items = collectDueItems(plants, today, 7);
    const groups = groupTodayByPlant(items);
    expect(groups.map((g) => g.plant.name)).toEqual(['Aloe', 'Basil', 'Zinnia']);
  });

  it('returns an empty array when no items are due today or overdue', () => {
    const plants: Plant[] = [
      plant({
        schedules: { water: [{ intervalDays: 7, activeMonths: ALL_MONTHS }] },
        lastDone: { water: '2026-05-08' }, // due in 5d
      }),
    ];
    const items = collectDueItems(plants, today, 7);
    expect(groupTodayByPlant(items)).toEqual([]);
  });
});
