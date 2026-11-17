import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('./firebase', () => ({ storage: {} }));
vi.mock('firebase/storage', () => ({
  ref: (_s: unknown, path: string) => path,
  getDownloadURL: vi.fn(),
  uploadBytes: vi.fn(),
  deleteObject: vi.fn(),
}));

import { getDownloadURL } from 'firebase/storage';
import { usePhotoUrl } from './photos';
import { resetToastsForTests, useToastMessage } from './toast';

describe('usePhotoUrl', () => {
  afterEach(() => {
    resetToastsForTests();
    vi.mocked(getDownloadURL).mockReset();
  });

  it('returns the download URL on success', async () => {
    vi.mocked(getDownloadURL).mockResolvedValue('https://example.test/p.jpg');
    const { result } = renderHook(() => usePhotoUrl('u1', 'ok-photo'));
    await waitFor(() => expect(result.current).toBe('https://example.test/p.jpg'));
  });

  it('shows an error toast with the Firebase code when a photo fails to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getDownloadURL).mockRejectedValue({ code: 'storage/unauthorized' });
    const { result } = renderHook(() => ({
      url: usePhotoUrl('u1', 'bad-photo'),
      toast: useToastMessage(),
    }));
    await waitFor(() =>
      expect(result.current.toast).toBe("Couldn't load plant photos. (storage/unauthorized)"),
    );
    expect(result.current.url).toBeUndefined();
  });
});
