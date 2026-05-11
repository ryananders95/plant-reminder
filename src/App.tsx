import { useEffect, useState } from 'react';
import { loadInitialState, patchUserDoc, saveState, subscribeToState } from './lib/storage';
import { onForegroundMessage } from './lib/messaging';
import { todayIso } from './lib/schedule';
import { useNavStack } from './lib/useNavStack';
import { signOut, useAuth } from './lib/auth';
import type { AppState, Plant, TaskType } from './types';
import { TodayView } from './components/TodayView';
import { PlantList } from './components/PlantList';
import { PlantForm } from './components/PlantForm';
import { SignInScreen } from './components/SignInButton';
import { InstallBanner } from './components/InstallBanner';
import { HelpScreen } from './components/HelpScreen';
import { SettingsScreen } from './components/SettingsScreen';

type Screen =
  | { kind: 'today' }
  | { kind: 'plants' }
  | { kind: 'detail'; plant: Plant | null }
  | { kind: 'help' }
  | { kind: 'settings' };

export function App() {
  const authState = useAuth();
  const [state, setState] = useState<AppState>(() => loadInitialState());
  const [hydrated, setHydrated] = useState(false);
  const { top, push, pop } = useNavStack<Screen>({ kind: 'today' });

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

  // Foreground FCM messages: when the app is open and Firebase routes the
  // push to the foreground via onMessage, surface it via the SW's
  // showNotification (Android Chrome rejects the Notification constructor
  // from the main thread for installed PWAs).
  useEffect(() => {
    if (!uid) return;
    return onForegroundMessage(async (payload) => {
      const data = payload.data ?? {};
      const title = data.title ?? 'PlantPapi';
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
    pop();
  };

  const deletePlant = (id: string) => {
    update({ ...state, plants: state.plants.filter((p) => p.id !== id) });
    pop();
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

  if (top.kind === 'settings') {
    return (
      <>
        <InstallBanner />
        <SettingsScreen
          uid={authState.uid}
          state={state}
          onUpdate={update}
          onClose={pop}
        />
      </>
    );
  }

  if (top.kind === 'help') {
    return (
      <>
        <InstallBanner />
        <HelpScreen onClose={pop} />
      </>
    );
  }

  if (top.kind === 'detail') {
    const editingPlant = top.plant;
    return (
      <>
        <InstallBanner />
        <PlantForm
          uid={authState.uid}
          plant={editingPlant}
          onSave={upsertPlant}
          onDelete={editingPlant ? () => deletePlant(editingPlant.id) : null}
          onCancel={pop}
        />
      </>
    );
  }

  const displayName = authState.displayName?.split(' ')[0] ?? 'Signed in';

  return (
    <div className="app">
      <InstallBanner />
      <header className="header">
        <h1>PlantPapi</h1>
        <div className="header-actions">
          <button
            className="signout-chip"
            onClick={() => {
              if (window.confirm(`Sign out of PlantPapi?`)) void signOut();
            }}
            aria-label="Sign out"
          >
            {displayName}
          </button>
          <button
            className="help-btn"
            onClick={() => push({ kind: 'settings' })}
            aria-label="Settings"
          >
            ⚙
          </button>
          <button
            className="help-btn"
            onClick={() => push({ kind: 'help' })}
            aria-label="Help"
          >
            ?
          </button>
        </div>
      </header>
      <main className="main">
        {top.kind === 'today' && (
          <TodayView
            uid={authState.uid}
            plants={state.plants}
            onMarkDone={markDone}
            onOpen={(id) => {
              const p = state.plants.find((x) => x.id === id);
              if (p) push({ kind: 'detail', plant: p });
            }}
          />
        )}
        {top.kind === 'plants' && (
          <PlantList
            uid={authState.uid}
            plants={state.plants}
            onSelect={(p) => push({ kind: 'detail', plant: p })}
            onAdd={() => push({ kind: 'detail', plant: null })}
          />
        )}
      </main>
      <nav className="tabbar">
        <button
          className={top.kind === 'today' ? 'tab active' : 'tab'}
          onClick={() => {
            if (top.kind === 'plants') pop();
          }}
        >
          Today
        </button>
        <button
          className={top.kind === 'plants' ? 'tab active' : 'tab'}
          onClick={() => {
            if (top.kind === 'today') push({ kind: 'plants' });
          }}
        >
          Plants
        </button>
      </nav>
    </div>
  );
}
