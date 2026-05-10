export const TASK_TYPES = ['water', 'fertilize', 'mist'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_LABELS: Record<TaskType, string> = {
  water: 'Water',
  fertilize: 'Fertilize',
  mist: 'Mist',
};

export const ALL_MONTHS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export interface ScheduleRule {
  intervalDays: number;
  activeMonths: number[]; // 1-12, may be empty (no reminders during those months)
}

export interface Plant {
  id: string;
  name: string;
  room?: string;
  notes?: string;
  photoFileId?: string;
  schedules: Partial<Record<TaskType, ScheduleRule[]>>;
  lastDone: Partial<Record<TaskType, string>>; // ISO date strings (YYYY-MM-DD)
}

export interface AppState {
  plants: Plant[];
  version: number;
}

export const CURRENT_VERSION = 2;
export const INITIAL_STATE: AppState = { plants: [], version: CURRENT_VERSION };
