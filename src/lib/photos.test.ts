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
import { deletePhoto, getPersistedPhotoUrl, PHOTO_CACHE_CONTROL, usePhotoUrl } from './photos';
import { resetToastsForTests, useToastMessage } from './toast';

describe('usePhotoUrl', () => {
  afterEach(() => {
    resetToastsForTests();
    vi.mocked(getDownloadURL).mockReset();
    localStorage.clear();
  });

  it('marks photos as long-lived and immutable for the browser cache', () => {
    expect(PHOTO_CACHE_CONTROL).toBe('private, max-age=31536000, immutable');
  });

  it('renders a URL saved on a previous launch immediately, before Storage answers', () => {
    localStorage.setItem(
      'plantreminder.photoUrls',
      JSON.stringify({ 'u1/saved-photo': 'https://example.test/saved.jpg' }),
    );
    vi.mocked(getDownloadURL).mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => usePhotoUrl('u1', 'saved-photo'));
    expect(result.current).toBe('https://example.test/saved.jpg');
  });

  it('saves the download URL for the next launch, and forgets it on delete', async () => {
    vi.mocked(getDownloadURL).mockResolvedValue('https://example.test/new.jpg');
    const { result } = renderHook(() => usePhotoUrl('u1', 'new-photo'));
    await waitFor(() => expect(result.current).toBe('https://example.test/new.jpg'));
    expect(getPersistedPhotoUrl('u1', 'new-photo')).toBe('https://example.test/new.jpg');

    await deletePhoto('u1', 'new-photo');
    expect(getPersistedPhotoUrl('u1', 'new-photo')).toBeUndefined();
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
