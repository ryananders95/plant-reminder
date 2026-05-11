import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
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
  // Strip fields managed by other systems so a full-state save can never race
  // with their writes. fcmTokens is managed by src/lib/messaging.ts via
  // arrayUnion/arrayRemove; lastNotifiedDay is managed by the cron in
  // scripts/notify.ts. Both can run while the React state still reflects a
  // pre-update snapshot, so blanketing them in via merge would clobber.
  const { fcmTokens: _t, lastNotifiedDay: _d, ...persisted } = state;
  void _t;
  void _d;
  try {
    await setDoc(doc(db, 'users', uid), persisted, { merge: true });
  } catch (err) {
    console.error('Firestore save error:', err);
  }
}

// Patch only the specified fields on the user doc. Safer than saveState when
// you don't have authoritative state yet (e.g., before Firestore subscription
// has populated React state).
export async function patchUserDoc(uid: string, patch: Partial<AppState>): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), patch);
  } catch (err) {
    console.error('Firestore patch error:', err);
  }
}
