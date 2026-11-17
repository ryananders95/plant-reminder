import { useSyncExternalStore } from 'react';

// Minimal app-wide error toast. Any module (React or not) can call
// showError(); the <Toast /> component mounted in main.tsx renders it.
// One toast at a time — a newer message replaces the current one.

const AUTO_DISMISS_MS = 6000;
// The same message won't re-appear within this window. Stops e.g. a dozen
// failed photo loads (or re-mounting a list) from spamming the same toast.
const REPEAT_COOLDOWN_MS = 60_000;

let current: string | null = null;
let dismissTimer: ReturnType<typeof setTimeout> | undefined;
const lastShownAt = new Map<string, number>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function showError(message: string): void {
  const now = Date.now();
  const last = lastShownAt.get(message);
  if (last !== undefined && now - last < REPEAT_COOLDOWN_MS) return;
  lastShownAt.set(message, now);
  current = message;
  clearTimeout(dismissTimer);
  dismissTimer = setTimeout(dismissToast, AUTO_DISMISS_MS);
  emit();
}

export function dismissToast(): void {
  clearTimeout(dismissTimer);
  if (current === null) return;
  current = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToastMessage(): string | null {
  return useSyncExternalStore(subscribe, () => current);
}

/** Firebase errors carry a `code` like "storage/unauthorized" — handy in the toast for diagnosis. */
export function errorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string') {
    return err.code;
  }
  return undefined;
}

export function withCode(message: string, err: unknown): string {
  const code = errorCode(err);
  return code ? `${message} (${code})` : message;
}

/** Test-only: clear state between tests. */
export function resetToastsForTests(): void {
  clearTimeout(dismissTimer);
  current = null;
  lastShownAt.clear();
  emit();
}
