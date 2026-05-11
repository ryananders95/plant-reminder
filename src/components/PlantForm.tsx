import { useEffect, useState } from 'react';
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
import { todayIso } from '../lib/schedule';
import { PhotoPicker } from './PhotoPicker';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function PlantForm({
  uid,
  plant,
  onSave,
  onDelete,
  onCancel,
}: {
  uid: string;
  plant: Plant | null;
  onSave: (plant: Plant) => void;
  onDelete: (() => void) | null;
  onCancel: () => void;
}) {
  const [name, setName] = useState(plant?.name ?? '');
  const [room, setRoom] = useState(plant?.room ?? '');
  const [notes, setNotes] = useState(plant?.notes ?? '');
  const [photoFileId, setPhotoFileId] = useState(plant?.photoFileId);
  const [schedules, setSchedules] = useState<Partial<Record<TaskType, ScheduleRule[]>>>(
    plant?.schedules ?? {},
  );
  const [lastDone, setLastDone] = useState<Partial<Record<TaskType, string>>>(
    plant?.lastDone ?? {},
  );

  const setRulesForTask = (type: TaskType, rules: ScheduleRule[] | undefined) => {
    setSchedules((prev) => {
      const next = { ...prev };
      if (rules) next[type] = rules;
      else delete next[type];
      return next;
    });
  };

  const setLastDoneForTask = (type: TaskType, value: string | undefined) => {
    setLastDone((prev) => {
      const next = { ...prev };
      if (value) next[type] = value;
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
      photoFileId,
      schedules,
      lastDone,
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
        <span className="header-btn header-btn-spacer" aria-hidden="true" />
      </header>

      <main className="form-body">
        <PhotoPicker uid={uid} photoId={photoFileId} onChange={setPhotoFileId} />

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
            lastDone={lastDone[type]}
            onLastDoneChange={(value) => setLastDoneForTask(type, value)}
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

      <footer className="form-footer">
        <button className="form-footer-save" onClick={handleSave} disabled={!canSave}>
          Save
        </button>
      </footer>
    </div>
  );
}

function IntervalDaysInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <input
      type="number"
      min={1}
      max={365}
      inputMode="numeric"
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        const n = parseInt(next, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= 365) {
          onChange(n);
        }
      }}
      onBlur={() => {
        const n = parseInt(text, 10);
        if (Number.isNaN(n) || n < 1 || n > 365) {
          setText(String(value));
        }
      }}
    />
  );
}

function ScheduleEditor({
  taskType,
  rules,
  onChange,
  lastDone,
  onLastDoneChange,
}: {
  taskType: TaskType;
  rules: ScheduleRule[] | undefined;
  onChange: (rules: ScheduleRule[] | undefined) => void;
  lastDone: string | undefined;
  onLastDoneChange: (value: string | undefined) => void;
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
          <div className="last-done-row">
            <label className="last-done-field">
              <span className="field-label">Last done</span>
              <input
                type="date"
                max={todayIso()}
                value={lastDone ?? ''}
                onChange={(e) => onLastDoneChange(e.target.value || undefined)}
              />
            </label>
            <div className="last-done-actions">
              <button
                type="button"
                className="last-done-btn"
                onClick={() => onLastDoneChange(todayIso())}
              >
                Today
              </button>
              {lastDone && (
                <button
                  type="button"
                  className="last-done-btn last-done-btn-clear"
                  onClick={() => onLastDoneChange(undefined)}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {rules.map((rule, idx) => (
            <div key={idx} className="rule-card">
              <div className="rule-header">
                <label className="field inline">
                  <span className="field-label">Every</span>
                  <IntervalDaysInput
                    value={rule.intervalDays}
                    onChange={(n) => updateRule(idx, { ...rule, intervalDays: n })}
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
