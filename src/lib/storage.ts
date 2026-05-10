import { CURRENT_VERSION, INITIAL_STATE, type AppState } from '../types';

const STORAGE_KEY = 'plantreminder.state';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_STATE };
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== CURRENT_VERSION) return { ...INITIAL_STATE };
    return parsed;
  } catch {
    return { ...INITIAL_STATE };
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
