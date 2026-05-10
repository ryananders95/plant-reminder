import { useEffect, useState } from 'react';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './firebase';

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
  await uploadBytes(photoRef(uid, photoId), resized, { contentType: 'image/jpeg' });
  return photoId;
}

const urlCache = new Map<string, Promise<string>>();

export function getPhotoUrl(uid: string, photoId: string): Promise<string> {
  const key = `${uid}/${photoId}`;
  const existing = urlCache.get(key);
  if (existing) return existing;
  const promise = getDownloadURL(photoRef(uid, photoId));
  urlCache.set(key, promise);
  promise.catch(() => urlCache.delete(key));
  return promise;
}

export async function deletePhoto(uid: string, photoId: string): Promise<void> {
  urlCache.delete(`${uid}/${photoId}`);
  try {
    await deleteObject(photoRef(uid, photoId));
  } catch {
    /* ignore — file may already be gone */
  }
}

export function usePhotoUrl(uid: string | null, photoId: string | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!uid || !photoId) {
      setUrl(undefined);
      return;
    }
    let cancelled = false;
    getPhotoUrl(uid, photoId)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, photoId]);

  return url;
}
