import { useEffect, useState } from 'react';
import { loadInitialState, patchUserDoc, saveState, subscribeToState } from './lib/storage';
import { onForegroundMessage } from './lib/messaging';
import { todayIso } from './lib/schedule';
import { signOut, useAuth } from './lib/auth';
import type { AppState, Plant, TaskType } from './types';
import { TodayView } from './components/TodayView';
import { PlantList } from './components/PlantList';
import { PlantForm } from './components/PlantForm';
import { SignInScreen } from './components/SignInButton';
import { InstallBanner } from './components/InstallBanner';
import { HelpScreen } from './components/HelpScreen';
import { SettingsScreen } from './components/SettingsScreen';

type Tab = 'today' | 'plants';
type Editing = Plant | 'new' | null;

export function App() {
  const authState = useAuth();
  const [state, setState] = useState<AppState>(() => loadInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>('today');
  const [editing, setEditing] = useState<Editing>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const uid = authState && authState !== 'loading' ? authState.uid : null;

  useEffect(() => {
    if (!uid) return;
    setHydrated(false);
    return subscribeToState(uid, (s) => {
      setState(s);
      setHydrated(true);
    });
  }, [uid]);

  useEffect(() => {
    if (!hydrated || !uid || state.timezone) return;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected) return;
    void patchUserDoc(uid, { timezone: detected });
  }, [hydrated, uid, state.timezone]);

  // Foreground FCM messages: when the app is open, the SW's onBackgroundMessage
  // doesn't fire — surface the notification ourselves. We use the SW's
  // showNotification rather than new Notification(...) because the latter
  // throws on Android Chrome for installed PWAs.
  useEffect(() => {
    if (!uid) return;
    return onForegroundMessage(async (payload) => {
      const data = payload.data ?? {};
      const title = data.title ?? 'Plant Reminder';
      const body = data.body ?? '';
      if (Notification.permission !== 'granted') return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const iconUrl = new URL('pwa-192x192.png', document.baseURI).href;
        const badgeUrl = new URL('pwa-64x64.png', document.baseURI).href;
        await reg.showNotification(title, { body, icon: iconUrl, badge: badgeUrl });
      } catch (err) {
        console.error('Failed to show foreground notification:', err);
      }
    });
  }, [uid]);

  if (authState === 'loading') {
    return (
      <>
        <InstallBanner />
        <div className="loading">Loading…</div>
      </>
    );
  }

  if (!authState) {
    return (
      <>
        <InstallBanner />
        <SignInScreen />
      </>
    );
  }

  const update = (newState: AppState) => {
    setState(newState);
    void saveState(authState.uid, newState);
  };

  const upsertPlant = (plant: Plant) => {
    const idx = state.plants.findIndex((p) => p.id === plant.id);
    const plants =
      idx >= 0 ? state.plants.map((p, i) => (i === idx ? plant : p)) : [...state.plants, plant];
    update({ ...state, plants });
    setEditing(null);
  };

  const deletePlant = (id: string) => {
    update({ ...state, plants: state.plants.filter((p) => p.id !== id) });
    setEditing(null);
  };

  const markDone = (plantId: string, taskType: TaskType) => {
    const today = todayIso();
    update({
      ...state,
      plants: state.plants.map((p) =>
        p.id === plantId ? { ...p, lastDone: { ...p.lastDone, [taskType]: today } } : p,
      ),
    });
  };

  if (showSettings) {
    return (
      <>
        <InstallBanner />
        <SettingsScreen
          uid={authState.uid}
          state={state}
          onUpdate={update}
          onClose={() => setShowSettings(false)}
        />
      </>
    );
  }

  if (showHelp) {
    return (
      <>
        <InstallBanner />
        <HelpScreen onClose={() => setShowHelp(false)} />
      </>
    );
  }

  if (editing) {
    const editingPlant = editing === 'new' ? null : editing;
    return (
      <>
        <InstallBanner />
        <PlantForm
          uid={authState.uid}
          plant={editingPlant}
          onSave={upsertPlant}
          onDelete={editingPlant ? () => deletePlant(editingPlant.id) : null}
          onCancel={() => setEditing(null)}
        />
      </>
    );
  }

  const displayName = authState.displayName?.split(' ')[0] ?? 'Signed in';

  return (
    <div className="app">
      <InstallBanner />
      <header className="header">
        <h1>Plant Reminder</h1>
        <div className="header-actions">
          <button
            className="signout-chip"
            onClick={() => {
              if (window.confirm(`Sign out of Plant Reminder?`)) void signOut();
            }}
            aria-label="Sign out"
          >
            {displayName}
          </button>
          <button
            className="help-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
          >
            ⚙
          </button>
          <button
            className="help-btn"
            onClick={() => setShowHelp(true)}
            aria-label="Help"
          >
            ?
          </button>
        </div>
      </header>
      <main className="main">
        {tab === 'today' && (
          <TodayView uid={authState.uid} plants={state.plants} onMarkDone={markDone} />
        )}
        {tab === 'plants' && (
          <PlantList
            uid={authState.uid}
            plants={state.plants}
            onSelect={(p) => setEditing(p)}
            onAdd={() => setEditing('new')}
          />
        )}
      </main>
      <nav className="tabbar">
        <button className={tab === 'today' ? 'tab active' : 'tab'} onClick={() => setTab('today')}>
          Today
        </button>
        <button
          className={tab === 'plants' ? 'tab active' : 'tab'}
          onClick={() => setTab('plants')}
        >
          Plants
        </button>
      </nav>
    </div>
  );
}
