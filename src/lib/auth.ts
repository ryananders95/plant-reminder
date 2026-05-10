import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

const provider = new GoogleAuthProvider();

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function signIn(): Promise<unknown> {
  return isMobile() ? signInWithRedirect(auth, provider) : signInWithPopup(auth, provider);
}

export function signOut(): Promise<void> {
  return fbSignOut(auth);
}

export type AuthState = User | null | 'loading';

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>('loading');

  useEffect(() => {
    getRedirectResult(auth).catch((err) => console.error('Sign-in redirect error:', err));
    const unsub = onAuthStateChanged(auth, (user) => setState(user));
    return unsub;
  }, []);

  return state;
}
