import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ALL_MONTHS,
  TASK_EMOJIS,
  TASK_LABELS,
  TASK_TYPES,
  type Plant,
  type ScheduleRule,
  type TaskType,
} from '../types';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function PlantForm({
  plant,
  onSave,
  onDelete,
  onCancel,
}: {
  plant: Plant | null;
  onSave: (plant: Plant) => void;
  onDelete: (() => void) | null;
  onCancel: () => void;
}) {
  const [name, setName] = useState(plant?.name ?? '');
  const [room, setRoom] = useState(plant?.room ?? '');
  const [notes, setNotes] = useState(plant?.notes ?? '');
  const [schedules, setSchedules] = useState<Partial<Record<TaskType, ScheduleRule[]>>>(
    plant?.schedules ?? {},
  );

  const setRulesForTask = (type: TaskType, rules: ScheduleRule[] | undefined) => {
    setSchedules((prev) => {
      const next = { ...prev };
      if (rules) next[type] = rules;
      else delete next[type];
      return next;
    });
  };

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const result: Plant = {
      id: plant?.id ?? uuidv4(),
      name: name.trim(),
      room: room.trim() || undefined,
      notes: notes.trim() || undefined,
      photoFileId: plant?.photoFileId,
      schedules,
      lastDone: plant?.lastDone ?? {},
    };
    onSave(result);
  };

  return (
    <div className="form">
      <header className="form-header">
        <button className="header-btn" onClick={onCancel}>
          Cancel
        </button>
        <h2>{plant ? 'Edit Plant' : 'New Plant'}</h2>
        <button className="header-btn primary" onClick={handleSave} disabled={!canSave}>
          Save
        </button>
      </header>

      <main className="form-body">
        <label className="field">
          <span className="field-label">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monstera" />
        </label>

        <label className="field">
          <span className="field-label">Room</span>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="e.g. Living Room"
          />
        </label>

        <label className="field">
          <span className="field-label">Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>

        <h3 className="section-title">Schedules</h3>
        {TASK_TYPES.map((type) => (
          <ScheduleEditor
            key={type}
            taskType={type}
            rules={schedules[type]}
            onChange={(rules) => setRulesForTask(type, rules)}
          />
        ))}

        {onDelete && (
          <button
            className="delete-button"
            onClick={() => {
              if (window.confirm('Delete this plant?')) onDelete();
            }}
          >
            Delete Plant
          </button>
        )}
      </main>
    </div>
  );
}

function ScheduleEditor({
  taskType,
  rules,
  onChange,
}: {
  taskType: TaskType;
  rules: ScheduleRule[] | undefined;
  onChange: (rules: ScheduleRule[] | undefined) => void;
}) {
  const enabled = !!rules;

  const updateRule = (idx: number, rule: ScheduleRule) => {
    if (!rules) return;
    onChange(rules.map((r, i) => (i === idx ? rule : r)));
  };

  const removeRule = (idx: number) => {
    if (!rules) return;
    onChange(rules.filter((_, i) => i !== idx));
  };

  const addRule = () => {
    onChange([...(rules ?? []), { intervalDays: 7, activeMonths: [] }]);
  };

  const toggleMonth = (ruleIdx: number, month: number) => {
    if (!rules) return;
    const target = rules[ruleIdx];
    const targetHasMonth = target.activeMonths.includes(month);
    const newRules = rules.map((r, i) => {
      if (i === ruleIdx) {
        return {
          ...r,
          activeMonths: targetHasMonth
            ? r.activeMonths.filter((m) => m !== month)
            : [...r.activeMonths, month].sort((a, b) => a - b),
        };
      }
      if (targetHasMonth) return r;
      return { ...r, activeMonths: r.activeMonths.filter((m) => m !== month) };
    });
    onChange(newRules);
  };

  const allCovered = new Set((rules ?? []).flatMap((r) => r.activeMonths));
  const uncovered = ALL_MONTHS.filter((m) => !allCovered.has(m));

  return (
    <fieldset className="schedule-editor">
      <legend>
        <label className="toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [{ intervalDays: 7, activeMonths: [...ALL_MONTHS] }]
                  : undefined,
              )
            }
          />
          <span>
            <span aria-hidden="true">{TASK_EMOJIS[taskType]}</span> {TASK_LABELS[taskType]}
          </span>
        </label>
      </legend>

      {rules && (
        <div className="schedule-body">
          {rules.map((rule, idx) => (
            <div key={idx} className="rule-card">
              <div className="rule-header">
                <label className="field inline">
                  <span className="field-label">Every</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    inputMode="numeric"
                    value={rule.intervalDays}
                    onChange={(e) =>
                      updateRule(idx, {
                        ...rule,
                        intervalDays: Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                  />
                  <span>days</span>
                </label>
                {rules.length > 1 && (
                  <button
                    type="button"
                    className="rule-delete"
                    aria-label="Remove this schedule"
                    onClick={() => removeRule(idx)}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="month-chips">
                {MONTH_LABELS.map((label, i) => {
                  const month = i + 1;
                  const on = rule.activeMonths.includes(month);
                  return (
                    <button
                      key={month}
                      type="button"
                      className={on ? 'chip on' : 'chip'}
                      onClick={() => toggleMonth(idx, month)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button type="button" className="add-rule" onClick={addRule}>
            + Add another schedule
          </button>

          {rules.length > 0 && uncovered.length > 0 && uncovered.length < 12 && (
            <div className="hint">
              No reminders during: {uncovered.map((m) => MONTH_LABELS[m - 1]).join(', ')}
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}
