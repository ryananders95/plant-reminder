import { format } from 'date-fns';
import {
  collectDueItems,
  groupTodayByPlant,
  type DueItem,
  type PlantDueGroup,
} from '../lib/schedule';
import { usePhotoUrl } from '../lib/photos';
import { TASK_EMOJIS, TASK_LABELS, type Plant, type TaskType } from '../types';

export function TodayView({
  uid,
  plants,
  onMarkDone,
}: {
  uid: string;
  plants: Plant[];
  onMarkDone: (plantId: string, taskType: TaskType) => void;
}) {
  const today = new Date();
  const items = collectDueItems(plants, today, 7);
  const todayGroups = groupTodayByPlant(items);
  const upcoming = items.filter((i) => i.daysUntilDue > 0);

  return (
    <div className="today">
      <h2 className="date">{format(today, 'EEEE, MMMM d')}</h2>

      {plants.length === 0 ? (
        <div className="empty">
          <p>No plants yet.</p>
          <p className="hint">Switch to the Plants tab to add your first one.</p>
        </div>
      ) : (
        <>
          <section>
            <h3 className="section-title">Today</h3>
            {todayGroups.length === 0 ? (
              <div className="empty">
                <p>All caught up!</p>
              </div>
            ) : (
              todayGroups.map((group) => (
                <PlantTodayCard
                  key={group.plant.id}
                  uid={uid}
                  group={group}
                  onMarkDone={onMarkDone}
                />
              ))
            )}
          </section>

          {upcoming.length > 0 && (
            <section>
              <h3 className="section-title">Coming Up</h3>
              {upcoming.map((item) => (
                <ComingUpRow
                  key={`${item.plant.id}-${item.taskType}`}
                  uid={uid}
                  item={item}
                  onMarkDone={onMarkDone}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PlantTodayCard({
  uid,
  group,
  onMarkDone,
}: {
  uid: string;
  group: PlantDueGroup;
  onMarkDone: (plantId: string, taskType: TaskType) => void;
}) {
  const { plant, tasks } = group;
  const photoUrl = usePhotoUrl(uid, plant.photoFileId);
  return (
    <div className="plant-card">
      <div className="plant-card-header-row">
        <PlantThumb photoUrl={photoUrl} />
        <div className="plant-card-info">
          <div className="plant-name">{plant.name}</div>
          {plant.room && <div className="plant-card-room">{plant.room}</div>}
        </div>
      </div>
      <div className="plant-card-actions">
        {tasks.map((task) => (
          <button
            key={task.taskType}
            className={`task-button ${task.daysUntilDue < 0 ? 'overdue' : 'today'}`}
            onClick={() => onMarkDone(plant.id, task.taskType)}
          >
            <span className="task-button-emoji" aria-hidden="true">
              {TASK_EMOJIS[task.taskType]}
            </span>
            {TASK_LABELS[task.taskType]}
            {task.daysUntilDue < 0 && (
              <span className="task-button-meta"> · {-task.daysUntilDue}d</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ComingUpRow({
  uid,
  item,
  onMarkDone,
}: {
  uid: string;
  item: DueItem;
  onMarkDone: (plantId: string, taskType: TaskType) => void;
}) {
  const { plant, taskType, daysUntilDue } = item;
  const detail = `In ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
  const photoUrl = usePhotoUrl(uid, plant.photoFileId);
  return (
    <div className="plant-card">
      <div className="plant-card-header-row">
        <PlantThumb photoUrl={photoUrl} />
        <div className="plant-card-info">
          <div className="plant-name">{plant.name}</div>
          <div className="plant-card-room">
            <span aria-hidden="true">{TASK_EMOJIS[taskType]}</span> {TASK_LABELS[taskType]} ·{' '}
            {detail}
            {plant.room ? ` · ${plant.room}` : ''}
          </div>
        </div>
      </div>
      <div className="plant-card-actions">
        <button className="complete-early" onClick={() => onMarkDone(plant.id, taskType)}>
          Complete early
        </button>
      </div>
    </div>
  );
}

function PlantThumb({ photoUrl }: { photoUrl: string | undefined }) {
  return (
    <span className="plant-thumb">
      {photoUrl ? <img src={photoUrl} alt="" /> : <span aria-hidden="true">🪴</span>}
    </span>
  );
}
