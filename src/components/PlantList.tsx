import { usePhotoUrl } from '../lib/photos';
import { TASK_EMOJIS, TASK_LABELS, type Plant, type TaskType } from '../types';

export function PlantList({
  uid,
  plants,
  onSelect,
  onAdd,
}: {
  uid: string;
  plants: Plant[];
  onSelect: (plant: Plant) => void;
  onAdd: () => void;
}) {
  const grouped: Record<string, Plant[]> = {};
  for (const plant of plants) {
    const room = plant.room || 'Unassigned';
    (grouped[room] ??= []).push(plant);
  }
  const rooms = Object.keys(grouped).sort();

  return (
    <div className="plants">
      <button className="add-button" onClick={onAdd}>
        + Add Plant
      </button>

      {plants.length === 0 ? (
        <div className="empty">
          <p>No plants yet.</p>
          <p className="hint">Tap "+ Add Plant" above to get started.</p>
        </div>
      ) : (
        rooms.map((room) => (
          <section key={room}>
            <h3 className="section-title">{room}</h3>
            {grouped[room]
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((plant) => (
                <PlantRow key={plant.id} uid={uid} plant={plant} onSelect={onSelect} />
              ))}
          </section>
        ))
      )}
    </div>
  );
}

function PlantRow({
  uid,
  plant,
  onSelect,
}: {
  uid: string;
  plant: Plant;
  onSelect: (plant: Plant) => void;
}) {
  const photoUrl = usePhotoUrl(uid, plant.photoFileId);
  const tasks =
    Object.keys(plant.schedules).length === 0
      ? 'No schedules'
      : (Object.keys(plant.schedules) as TaskType[])
          .map((t) => `${TASK_EMOJIS[t]} ${TASK_LABELS[t]}`)
          .join(' · ');

  return (
    <button className="plant-row" onClick={() => onSelect(plant)}>
      <PlantThumb photoUrl={photoUrl} />
      <span className="plant-row-text">
        <span className="plant-name">{plant.name}</span>
        <span className="plant-tasks">{tasks}</span>
      </span>
    </button>
  );
}

function PlantThumb({ photoUrl }: { photoUrl: string | undefined }) {
  return (
    <span className="plant-thumb">
      {photoUrl ? <img src={photoUrl} alt="" /> : <span aria-hidden="true">🪴</span>}
    </span>
  );
}
