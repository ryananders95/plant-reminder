import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { dismissToast, resetToastsForTests, showError, useToastMessage, withCode } from './toast';

describe('toast store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetToastsForTests();
  });
  afterEach(() => {
    resetToastsForTests();
    vi.useRealTimers();
  });

  it('shows a message and auto-dismisses it after 6s', () => {
    const { result } = renderHook(() => useToastMessage());
    expect(result.current).toBeNull();

    act(() => showError('Boom'));
    expect(result.current).toBe('Boom');

    act(() => vi.advanceTimersByTime(5999));
    expect(result.current).toBe('Boom');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBeNull();
  });

  it('a newer message replaces the current one', () => {
    const { result } = renderHook(() => useToastMessage());
    act(() => showError('First'));
    act(() => showError('Second'));
    expect(result.current).toBe('Second');
  });

  it('suppresses the same message for 60s, even after dismissal', () => {
    const { result } = renderHook(() => useToastMessage());
    act(() => showError('Photos broke'));
    act(() => dismissToast());
    act(() => showError('Photos broke'));
    expect(result.current).toBeNull();

    act(() => vi.advanceTimersByTime(60_000));
    act(() => showError('Photos broke'));
    expect(result.current).toBe('Photos broke');
  });
});

describe('withCode', () => {
  it('appends a Firebase error code when present', () => {
    expect(withCode('Failed.', { code: 'storage/unauthorized' })).toBe(
      'Failed. (storage/unauthorized)',
    );
  });

  it('leaves the message alone for errors without a code', () => {
    expect(withCode('Failed.', new Error('x'))).toBe('Failed.');
    expect(withCode('Failed.', undefined)).toBe('Failed.');
  });
});
