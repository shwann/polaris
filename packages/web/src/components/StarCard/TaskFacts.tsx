import type { Task } from '@polaris/core';
import { useData } from '../../hooks/useBoard';
import { fmt } from '../../domain/time';
import styles from './TaskFacts.module.css';

/** Read-only task context remains visible even when the local editor is unavailable. */
export function TaskFacts({ task: t }: { task: Task }) {
  const { snapshot } = useData();
  const requirements = snapshot?.requirements.filter((r) => t.reqIds.includes(r.id) || r.taskIds.includes(t.id)) ?? [];
  const events = snapshot?.events.filter((e) => e.taskId === t.id).slice(0, 3) ?? [];
  return (
    <>
      {(t.progress !== undefined || t.steps.length > 0) && (
        <div className={styles.facts}>
          {t.progress !== undefined && <p>进度 {t.progress}%</p>}
          {t.steps.length > 0 && <p>{t.steps.map((s) => `${s.state === 'done' ? '✓ ' : ''}${s.name}`).join(' → ')}</p>}
        </div>
      )}
      {requirements.length > 0 && (
        <div className={styles.facts} aria-label="关联需求">
          {requirements.map((r) => (
            <p key={r.id}>
              需求 {r.id} · {r.title}
            </p>
          ))}
        </div>
      )}
      {events.length > 0 && (
        <ul className={styles.events} aria-label="任务事件">
          {events.map((e, i) => (
            <li key={`${e.at}:${i}`}>
              <time dateTime={e.at}>{fmt(e.at, true)}</time> {e.text}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
