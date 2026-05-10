import { addDays, addMonths, differenceInCalendarDays, format, parseISO, startOfDay, startOfMonth } from 'date-fns';
import type { Plant, ScheduleRule, TaskType } from '../types';

export const ISO_DATE = 'yyyy-MM-dd';

export function todayIso(): string {
  return format(startOfDay(new Date()), ISO_DATE);
}

export function parseIsoDate(s: string): Date {
  return startOfDay(parseISO(s));
}

function ruleForMonth(rules: ScheduleRule[], month: number): ScheduleRule | undefined {
  return rules.find((r) => r.activeMonths.includes(month));
}

export function nextDueDate(plant: Plant, taskType: TaskType, today: Date): Date | null {
  const rules = plant.schedules[taskType];
  if (!rules || rules.length === 0) return null;

  const allActiveMonths = new Set(rules.flatMap((r) => r.activeMonths));
  if (allActiveMonths.size === 0) return null;

  const lastDoneStr = plant.lastDone[taskType];
  let candidate: Date;

  if (lastDoneStr) {
    const lastDone = parseIsoDate(lastDoneStr);
    const rule = ruleForMonth(rules, lastDone.getMonth() + 1);
    candidate = rule ? addDays(lastDone, rule.intervalDays) : lastDone;
  } else {
    candidate = startOfDay(today);
  }

  for (let i = 0; i < 13 && !allActiveMonths.has(candidate.getMonth() + 1); i++) {
    candidate = startOfMonth(addMonths(candidate, 1));
  }

  return candidate;
}

export function daysUntilDue(plant: Plant, taskType: TaskType, today: Date): number | null {
  const due = nextDueDate(plant, taskType, today);
  if (!due) return null;
  return differenceInCalendarDays(due, startOfDay(today));
}

export function isDue(plant: Plant, taskType: TaskType, today: Date): boolean {
  const days = daysUntilDue(plant, taskType, today);
  return days !== null && days <= 0;
}

export interface DueItem {
  plant: Plant;
  taskType: TaskType;
  daysUntilDue: number;
}

export function collectDueItems(plants: Plant[], today: Date, withinDays = 3): DueItem[] {
  const items: DueItem[] = [];
  for (const plant of plants) {
    for (const taskType of Object.keys(plant.schedules) as TaskType[]) {
      const days = daysUntilDue(plant, taskType, today);
      if (days === null) continue;
      if (days <= withinDays) items.push({ plant, taskType, daysUntilDue: days });
    }
  }
  items.sort((a, b) => a.daysUntilDue - b.daysUntilDue || a.plant.name.localeCompare(b.plant.name));
  return items;
}

export function summarizeRules(rules: ScheduleRule[]): string {
  if (!rules || rules.length === 0) return '';
  const parts = rules
    .filter((r) => r.activeMonths.length > 0)
    .map((r) => `${r.intervalDays}d ${monthsLabel(r.activeMonths)}`);
  return parts.join(' · ');
}

const MONTH_ABBR = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthsLabel(months: number[]): string {
  if (months.length === 12) return 'all year';
  const sorted = [...months].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      ranges.push(start === prev ? MONTH_ABBR[start] : `${MONTH_ABBR[start]}-${MONTH_ABBR[prev]}`);
      start = sorted[i];
      prev = sorted[i];
    }
  }
  ranges.push(start === prev ? MONTH_ABBR[start] : `${MONTH_ABBR[start]}-${MONTH_ABBR[prev]}`);
  return ranges.join(', ');
}
