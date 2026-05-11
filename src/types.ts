// Order matters: this drives the display order for schedule editors in
// PlantForm, task buttons in TodayView cards, the comma-joined summary in
// PlantList, and tie-breaks in schedule.ts sorts.
export const TASK_TYPES = ['water', 'mist', 'fertilize'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_LABELS: Record<TaskType, string> = {
  water: 'Water',
  fertilize: 'Fertilize',
  mist: 'Mist',
};

export const TASK_EMOJIS: Record<TaskType, string> = {
  water: '💧',
  fertilize: '🍩',
  mist: '💦',
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
  notificationsEnabled?: boolean;
  notificationTime?: string; // "HH:MM" 24-hour, in user's local timezone
  timezone?: string; // IANA tz, e.g. "America/New_York"
  fcmTokens?: string[]; // managed by registerFcmToken / unregisterFcmToken
  lastNotifiedDay?: string; // managed by cron only, "yyyy-MM-dd" in user's tz
}

export const CURRENT_VERSION = 2;
export const INITIAL_STATE: AppState = { plants: [], version: CURRENT_VERSION };
