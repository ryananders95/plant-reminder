import { useEffect, useState } from 'react';
import {
  isPushSupported,
  registerFcmToken,
  requestNotificationPermission,
  unregisterFcmToken,
} from '../lib/messaging';
import type { AppState } from '../types';

export function SettingsScreen({
  uid,
  state,
  onUpdate,
  onClose,
}: {
  uid: string;
  state: AppState;
  onUpdate: (next: AppState) => void;
  onClose: () => void;
}) {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    'Notification' in window ? Notification.permission : 'denied',
  );
  const [supported, setSupported] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void isPushSupported().then(setSupported);
  }, []);

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const enabled = state.notificationsEnabled === true && permission === 'granted';

  const handleToggle = async () => {
    setError(null);
    setBusy(true);
    try {
      if (enabled) {
        await unregisterFcmToken(uid);
        onUpdate({ ...state, notificationsEnabled: false });
      } else {
        if (permission !== 'granted') {
          const result = await requestNotificationPermission();
          setPermission(result);
          if (result !== 'granted') {
            setError(
              "Notification permission wasn't granted. Enable it for this site in your browser or OS settings, then come back here.",
            );
            return;
          }
        }
        const token = await registerFcmToken(uid);
        if (!token) {
          setError(
            'Could not register for push notifications. You may need to install the PWA to your home screen first (especially on iPhone).',
          );
          return;
        }
        const tz =
          state.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const time = state.notificationTime || '08:00';
        onUpdate({
          ...state,
          notificationsEnabled: true,
          timezone: tz,
          notificationTime: time,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleTimeChange = (newTime: string) => {
    if (!newTime) return;
    onUpdate({ ...state, notificationTime: newTime });
  };

  const detectedTz = state.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  return (
    <div className="form">
      <header className="form-header">
        <button className="header-btn" onClick={onClose}>
          Close
        </button>
        <h2>Settings</h2>
        <span className="header-btn header-btn-spacer" aria-hidden="true" />
      </header>

      <main className="form-body">
        <h3 className="help-heading">Daily reminders</h3>

        {supported === false || (isIOS && !isStandalone) ? (
          <p className="hint">
            {isIOS && !isStandalone ? (
              <>
                To use push notifications on iPhone, first tap Share →{' '}
                <strong>Add to Home Screen</strong>, then open Plant Reminder from your home
                screen and come back here.
              </>
            ) : (
              <>Push notifications aren't supported on this device or browser.</>
            )}
          </p>
        ) : (
          <>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={handleToggle}
                disabled={busy || supported === null}
              />
              <span>Push me when plants need attention</span>
            </label>

            {permission === 'denied' && (
              <p className="hint">
                Notifications are blocked for this site. Enable them in your browser settings
                (Chrome: tap the lock icon in the address bar → Notifications; Safari: Settings
                → Plant Reminder → Notifications) and toggle the switch again.
              </p>
            )}

            {enabled && (
              <>
                <label className="field">
                  <span className="field-label">Notification time</span>
                  <input
                    type="time"
                    value={state.notificationTime || '08:00'}
                    onChange={(e) => handleTimeChange(e.target.value)}
                  />
                </label>

                <p className="hint">
                  Time zone: <strong>{detectedTz}</strong> (detected from your device).
                </p>
                <p className="hint">
                  You'll get a push within ~30 minutes of your chosen time, but only on days
                  when at least one plant has a task due or overdue.
                </p>
              </>
            )}
          </>
        )}

        {error && <p className="signin-error">{error}</p>}

        <h3 className="help-heading">Tips</h3>
        <ul>
          <li>Install Plant Reminder to your home screen for the most reliable delivery.</li>
          <li>
            iPhone: you must add the app to your home screen and open it from there before
            notifications can work.
          </li>
          <li>
            You can revoke notification permission anytime through your browser or OS settings.
          </li>
        </ul>
      </main>
    </div>
  );
}
