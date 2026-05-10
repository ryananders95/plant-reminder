import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'plantreminder.installBannerDismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(
    () => localStorage.getItem(DISMISS_KEY) === 'true',
  );
  const [installed, setInstalled] = useState<boolean>(isStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (dismissed || installed) return null;

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !/(CriOS|FxiOS)/.test(ua);
  const isAndroid = /Android/.test(ua);
  if (!isIOS && !isAndroid) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  const triggerAndroidInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const result = await deferred.userChoice;
    setDeferred(null);
    if (result.outcome === 'accepted') dismiss();
  };

  return (
    <div className="install-banner" role="region" aria-label="Install Plant Reminder">
      <span className="install-banner-icon" aria-hidden="true">
        📲
      </span>
      <span className="install-banner-text">
        {isIOS ? (
          <>
            Add to Home Screen: tap <strong>Share</strong> →{' '}
            <strong>Add to Home Screen</strong>
          </>
        ) : deferred ? (
          <>Install Plant Reminder for offline use and push notifications.</>
        ) : (
          <>
            Install for the best experience: open Chrome menu (⋮) → <strong>Install app</strong>.
          </>
        )}
      </span>
      {isAndroid && deferred && (
        <button className="install-banner-install" onClick={triggerAndroidInstall}>
          Install
        </button>
      )}
      <button
        className="install-banner-dismiss"
        onClick={dismiss}
        aria-label="Dismiss install banner"
      >
        ✕
      </button>
    </div>
  );
}
