import { useState } from 'react';
import { useStore } from 'zustand';
import { LANES, LANE_LABELS, type Task } from '@polaris/core';
import { dataStore, submitWrite } from '../../store/dataStore';
import styles from './TaskEditor.module.css';

function Progress({ task: t }: { task: Task }) {
  const [value, setValue] = useState(t.progress === undefined ? '' : String(t.progress));
  const writing = useStore(dataStore, (s) => s.writing);
  const submit = () => {
    if (value === (t.progress === undefined ? '' : String(t.progress))) return;
    if (!value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100) {
      dataStore.setState({
        notice: { text: '进度必须是 0～100 的数字', error: true },
        writeRevision: dataStore.getState().writeRevision + 1,
      });
      return;
    }
    void submitWrite('/api/task/progress', { id: t.id, progress: Number(value) }, `${t.code} 进度 ${value}%`);
  };
  return (
    <input
      className={styles.progress}
      aria-label={`${t.code} 进度`}
      type="number"
      min="0"
      max="100"
      step="5"
      value={value}
      disabled={writing}
      onChange={(e) => setValue(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}
export function TaskEditor({ task: t }: { task: Task }) {
  const credentials = useStore(dataStore, (s) => s.origin === 'local' && s.credentials);
  const writing = useStore(dataStore, (s) => s.writing);
  const revision = useStore(dataStore, (s) => s.writeRevision);
  if (!credentials) return null;
  return (
    <div className={styles.editor}>
      <label>
        分组{' '}
        <select
          aria-label={`${t.code} 分组`}
          value={t.lane}
          disabled={writing}
          onChange={(e) =>
            void submitWrite(
              '/api/task/move',
              { id: t.id, lane: e.target.value },
              `${t.code} 分组 ${LANE_LABELS[e.target.value as Task['lane']]}`,
            )
          }
        >
          {LANES.map((lane) => (
            <option key={lane} value={lane}>
              {LANE_LABELS[lane]}
            </option>
          ))}
        </select>
      </label>
      <label>
        进度 <Progress key={`${t.id}:${t.progress}:${revision}`} task={t} /> %
      </label>
    </div>
  );
}
