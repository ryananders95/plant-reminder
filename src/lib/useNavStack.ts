import { useCallback, useEffect, useRef, useState } from 'react';

/** Returns true if it's OK to leave the current screen (may prompt the user). */
export type LeaveGuard = () => boolean;

export function useNavStack<T>(root: T) {
  const [stack, setStack] = useState<T[]>([root]);
  const guardRef = useRef<LeaveGuard | null>(null);

  const push = useCallback((screen: T) => {
    setStack((prev) => [...prev, screen]);
    window.history.pushState({}, '');
  }, []);

  // popstate is the single source of truth — both the system back button
  // and in-app close paths go through it. pop() triggers history.back(),
  // which fires popstate, which updates the stack.
  const pop = useCallback(() => {
    window.history.back();
  }, []);

  // The top screen can register a guard (e.g. "Discard changes?"). Because
  // every close path goes through popstate, one check covers Cancel, system
  // Back, and swipe-back. If the guard says stay, the browser has already
  // moved back one history entry, so push it again to stay in sync.
  const setLeaveGuard = useCallback((guard: LeaveGuard | null) => {
    guardRef.current = guard;
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (guardRef.current && !guardRef.current()) {
        window.history.pushState({}, '');
        return;
      }
      setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return { stack, top: stack[stack.length - 1], push, pop, setLeaveGuard };
}
