import { useRef, useState } from 'react';
import { deletePhoto, uploadPhoto, usePhotoUrl } from '../lib/photos';

export function PhotoPicker({
  uid,
  photoId,
  onChange,
}: {
  uid: string;
  photoId: string | undefined;
  onChange: (next: string | undefined) => void;
}) {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const libraryRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<'uploading' | 'removing' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const url = usePhotoUrl(uid, photoId);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setBusy('uploading');
    try {
      const newId = await uploadPhoto(uid, file);
      const oldId = photoId;
      onChange(newId);
      if (oldId) await deletePhoto(uid, oldId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      console.error('Photo upload failed:', err);
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async () => {
    if (!photoId) return;
    setError(null);
    setBusy('removing');
    try {
      const oldId = photoId;
      onChange(undefined);
      await deletePhoto(uid, oldId);
    } catch (err) {
      console.error('Photo remove failed:', err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="photo-picker">
      <div className="photo-tile" aria-label={photoId ? 'Plant photo' : 'No plant photo'}>
        {url ? <img src={url} alt="" /> : <span className="photo-tile-placeholder">🪴</span>}
        {busy === 'uploading' && <span className="photo-tile-overlay">Uploading…</span>}
      </div>
      <div className="photo-picker-actions">
        <button
          type="button"
          className="photo-picker-btn"
          onClick={() => cameraRef.current?.click()}
          disabled={busy !== null}
        >
          <span aria-hidden="true">📷</span> Take photo
        </button>
        <button
          type="button"
          className="photo-picker-btn"
          onClick={() => libraryRef.current?.click()}
          disabled={busy !== null}
        >
          <span aria-hidden="true">🖼️</span> Choose photo
        </button>
        {photoId && (
          <button
            type="button"
            className="photo-picker-btn photo-picker-btn-danger"
            onClick={handleRemove}
            disabled={busy !== null}
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      {error && <p className="photo-picker-error">{error}</p>}
    </div>
  );
}
