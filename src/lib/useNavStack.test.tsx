import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNavStack } from './useNavStack';

type Screen = { kind: 'a' } | { kind: 'b' } | { kind: 'c' };

const root: Screen = { kind: 'a' };
const b: Screen = { kind: 'b' };
const c: Screen = { kind: 'c' };

describe('useNavStack', () => {
  it('starts with the root on top of the stack', () => {
    const { result } = renderHook(() => useNavStack<Screen>(root));
    expect(result.current.stack).toEqual([root]);
    expect(result.current.top).toBe(root);
  });

  it('push adds a screen to the top of the stack', () => {
    const { result } = renderHook(() => useNavStack<Screen>(root));
    act(() => result.current.push(b));
    expect(result.current.stack).toEqual([root, b]);
    expect(result.current.top).toBe(b);
  });

  it('a popstate event pops one screen off the stack', () => {
    const { result } = renderHook(() => useNavStack<Screen>(root));
    act(() => result.current.push(b));
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.stack).toEqual([root]);
    expect(result.current.top).toBe(root);
  });

  it('popstate at the root is a no-op (does not underflow)', () => {
    const { result } = renderHook(() => useNavStack<Screen>(root));
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.stack).toEqual([root]);
  });

  it('multiple pushes then a popstate pops only the topmost', () => {
    const { result } = renderHook(() => useNavStack<Screen>(root));
    act(() => result.current.push(b));
    act(() => result.current.push(c));
    expect(result.current.top).toBe(c);
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.stack).toEqual([root, b]);
    expect(result.current.top).toBe(b);
  });

  it('pop() triggers window.history.back so back-button and UI close share one path', () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    try {
      const { result } = renderHook(() => useNavStack<Screen>(root));
      act(() => result.current.push(b));
      act(() => result.current.pop());
      expect(backSpy).toHaveBeenCalledTimes(1);
    } finally {
      backSpy.mockRestore();
    }
  });
});
