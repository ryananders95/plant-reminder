import { useCallback, useEffect, useState } from 'react';

export function useNavStack<T>(root: T) {
  const [stack, setStack] = useState<T[]>([root]);

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

  useEffect(() => {
    const onPop = () => {
      setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return { stack, top: stack[stack.length - 1], push, pop };
}
