import { useEffect, useState } from 'react';
import { loadState, saveState } from './lib/storage';
import { todayIso } from './lib/schedule';
import type { AppState, Plant, TaskType } from './types';
import { TodayView } from './components/TodayView';
import { PlantList } from './components/PlantList';
import { PlantForm } from './components/PlantForm';

type Tab = 'today' | 'plants';
type Editing = Plant | 'new' | null;

export function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [tab, setTab] = useState<Tab>('today');
  const [editing, setEditing] = useState<Editing>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const upsertPlant = (plant: Plant) => {
    setState((prev) => {
      const idx = prev.plants.findIndex((p) => p.id === plant.id);
      const plants =
        idx >= 0 ? prev.plants.map((p, i) => (i === idx ? plant : p)) : [...prev.plants, plant];
      return { ...prev, plants };
    });
    setEditing(null);
  };

  const deletePlant = (id: string) => {
    setState((prev) => ({ ...prev, plants: prev.plants.filter((p) => p.id !== id) }));
    setEditing(null);
  };

  const markDone = (plantId: string, taskType: TaskType) => {
    const today = todayIso();
    setState((prev) => ({
      ...prev,
      plants: prev.plants.map((p) =>
        p.id === plantId ? { ...p, lastDone: { ...p.lastDone, [taskType]: today } } : p,
      ),
    }));
  };

  if (editing) {
    const editingPlant = editing === 'new' ? null : editing;
    return (
      <PlantForm
        plant={editingPlant}
        onSave={upsertPlant}
        onDelete={editingPlant ? () => deletePlant(editingPlant.id) : null}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Plant Reminder</h1>
      </header>
      <main className="main">
        {tab === 'today' && <TodayView plants={state.plants} onMarkDone={markDone} />}
        {tab === 'plants' && (
          <PlantList
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
