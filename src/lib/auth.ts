import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

const provider = new GoogleAuthProvider();

export function signIn(): Promise<unknown> {
  return signInWithPopup(auth, provider);
}

export function signOut(): Promise<void> {
  return fbSignOut(auth);
}

export type AuthState = User | null | 'loading';

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>('loading');

  useEffect(() => {
    // Drain any pending redirect from older sign-in attempts, then ignore.
    getRedirectResult(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, (user) => setState(user));
    return unsub;
  }, []);

  return state;
}
