import { format } from 'date-fns';
import { collectDueItems, type DueItem } from '../lib/schedule';
import { TASK_LABELS, type Plant, type TaskType } from '../types';

export function TodayView({
  plants,
  onMarkDone,
}: {
  plants: Plant[];
  onMarkDone: (plantId: string, taskType: TaskType) => void;
}) {
  const today = new Date();
  const items = collectDueItems(plants, today, 7);

  const overdue = items.filter((i) => i.daysUntilDue < 0);
  const dueToday = items.filter((i) => i.daysUntilDue === 0);
  const upcoming = items.filter((i) => i.daysUntilDue > 0);

  return (
    <div className="today">
      <h2 className="date">{format(today, 'EEEE, MMMM d')}</h2>

      {plants.length === 0 && (
        <div className="empty">
          <p>No plants yet.</p>
          <p className="hint">Switch to the Plants tab to add your first one.</p>
        </div>
      )}

      {overdue.length > 0 && (
        <section>
          <h3 className="section-title overdue">Overdue</h3>
          {overdue.map((item) => (
            <DueRow key={key(item)} item={item} onMarkDone={onMarkDone} />
          ))}
        </section>
      )}

      {dueToday.length > 0 && (
        <section>
          <h3 className="section-title">Due Today</h3>
          {dueToday.map((item) => (
            <DueRow key={key(item)} item={item} onMarkDone={onMarkDone} />
          ))}
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h3 className="section-title">Coming Up</h3>
          {upcoming.map((item) => (
            <DueRow key={key(item)} item={item} onMarkDone={onMarkDone} />
          ))}
        </section>
      )}

      {plants.length > 0 && items.length === 0 && (
        <div className="empty">
          <p>All caught up.</p>
          <p className="hint">Nothing due in the next week.</p>
        </div>
      )}
    </div>
  );
}

function key(item: DueItem) {
  return `${item.plant.id}-${item.taskType}`;
}

function DueRow({
  item,
  onMarkDone,
}: {
  item: DueItem;
  onMarkDone: (plantId: string, taskType: TaskType) => void;
}) {
  const { plant, taskType, daysUntilDue } = item;
  const detail =
    daysUntilDue < 0
      ? `${-daysUntilDue} day${-daysUntilDue === 1 ? '' : 's'} overdue`
      : daysUntilDue === 0
        ? 'Today'
        : `In ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;

  return (
    <div className={`duerow ${daysUntilDue < 0 ? 'is-overdue' : ''}`}>
      <div className="duerow-info">
        <div className="plant-name">{plant.name}</div>
        <div className="task-meta">
          {TASK_LABELS[taskType]} · {detail}
          {plant.room ? ` · ${plant.room}` : ''}
        </div>
      </div>
      <button className="mark-done" onClick={() => onMarkDone(plant.id, taskType)}>
        Done
      </button>
    </div>
  );
}
