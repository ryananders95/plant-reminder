import { useEffect, useState } from 'react';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './firebase';
import { showError, withCode } from './toast';

export const PHOTO_CACHE_CONTROL = 'private, max-age=31536000, immutable';

const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.85;

function photoRef(uid: string, photoId: string) {
  return ref(storage, `users/${uid}/photos/${photoId}.jpg`);
}

async function resizeImage(file: File | Blob): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Image load failed'));
    el.src = dataUrl;
  });

  const scale = Math.min(MAX_EDGE / img.width, MAX_EDGE / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0, w, h);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob returned null'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

export async function uploadPhoto(uid: string, file: File | Blob): Promise<string> {
  const resized = await resizeImage(file);
  const photoId = uuidv4();
  await uploadBytes(photoRef(uid, photoId), resized, {
    contentType: 'image/jpeg',
    // Photos are immutable (a replacement gets a new UUID), so let the
    // browser keep them for a year instead of Storage's default
    // `private, max-age=0`, which revalidates on every launch.
    cacheControl: PHOTO_CACHE_CONTROL,
  });
  return photoId;
}

// Download URLs persist across launches so a photo can render on first paint
// without waiting on getDownloadURL. Photo IDs are never reused (a replaced
// photo gets a new UUID), so a stored URL never points at the wrong image.
// The image bytes are cached by the browser's HTTP cache, keyed by this same
// URL, for as long as the object's Cache-Control allows (see uploadPhoto).
const PERSISTED_URLS_KEY = 'plantreminder.photoUrls';

function readPersistedUrls(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PERSISTED_URLS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writePersistedUrl(key: string, url: string | undefined): void {
  try {
    const all = readPersistedUrls();
    if (url === undefined) delete all[key];
    else if (all[key] === url) return;
    else all[key] = url;
    localStorage.setItem(PERSISTED_URLS_KEY, JSON.stringify(all));
  } catch {
    /* storage full or unavailable — the in-memory cache still works */
  }
}

export function getPersistedPhotoUrl(uid: string, photoId: string): string | undefined {
  return readPersistedUrls()[`${uid}/${photoId}`];
}

const urlCache = new Map<string, Promise<string>>();

export function getPhotoUrl(uid: string, photoId: string): Promise<string> {
  const key = `${uid}/${photoId}`;
  const existing = urlCache.get(key);
  if (existing) return existing;
  const promise = getDownloadURL(photoRef(uid, photoId));
  urlCache.set(key, promise);
  promise.then(
    (url) => writePersistedUrl(key, url),
    () => urlCache.delete(key),
  );
  return promise;
}

export async function deletePhoto(uid: string, photoId: string): Promise<void> {
  urlCache.delete(`${uid}/${photoId}`);
  writePersistedUrl(`${uid}/${photoId}`, undefined);
  try {
    await deleteObject(photoRef(uid, photoId));
  } catch {
    /* ignore — file may already be gone */
  }
}

export function usePhotoUrl(uid: string | null, photoId: string | undefined): string | undefined {
  // Start from the URL saved on a previous launch, if any, so the image (served
  // from the browser cache) shows immediately instead of a placeholder.
  const [url, setUrl] = useState<string | undefined>(() =>
    uid && photoId ? getPersistedPhotoUrl(uid, photoId) : undefined,
  );

  useEffect(() => {
    if (!uid || !photoId) {
      setUrl(undefined);
      return;
    }
    setUrl(getPersistedPhotoUrl(uid, photoId));
    // Still confirm with Storage once per session: it's a small metadata
    // request (no image bytes), and it's what surfaces the error toast if
    // Storage becomes unavailable. Same URL back → no re-render, no re-download.
    let cancelled = false;
    getPhotoUrl(uid, photoId)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch((err) => {
        console.error('Photo load failed:', err);
        // Every photo failing at once usually means Storage itself is
        // unavailable (e.g. the project fell off the Blaze plan) — see SETUP.md.
        showError(withCode("Couldn't load plant photos.", err));
        if (!cancelled) setUrl(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, photoId]);

  return url;
}
