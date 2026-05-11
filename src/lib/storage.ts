import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { CURRENT_VERSION, INITIAL_STATE, type AppState } from '../types';

const CACHE_KEY = 'plantreminder.state';

function readCache(): AppState | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== CURRENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(state: AppState): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(state));
}

export function loadInitialState(): AppState {
  return readCache() ?? { ...INITIAL_STATE };
}

export function subscribeToState(uid: string, onChange: (state: AppState) => void): () => void {
  const ref = doc(db, 'users', uid);
  return onSnapshot(
    ref,
    async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppState;
        writeCache(data);
        onChange(data);
      } else {
        const cached = readCache();
        const seed = cached && cached.plants.length > 0 ? cached : { ...INITIAL_STATE };
        writeCache(seed);
        onChange(seed);
        try {
          await setDoc(ref, seed);
        } catch (err) {
          console.error('Failed to seed initial state:', err);
        }
      }
    },
    (err) => console.error('Firestore subscribe error:', err),
  );
}

export async function saveState(uid: string, state: AppState): Promise<void> {
  writeCache(state);
  try {
    // merge: true so dedicated writers (e.g., FCM token mgmt, cron lastNotifiedDay)
    // don't get clobbered by an app-side full-state write.
    await setDoc(doc(db, 'users', uid), state, { merge: true });
  } catch (err) {
    console.error('Firestore save error:', err);
  }
}
