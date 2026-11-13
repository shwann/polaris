import type { Task } from '@polaris/core';
import styles from './TaskExecution.module.css';

export function TaskExecution({ task: t }: { task: Task }) {
  if (!t.executor && !t.dispatchEngine) return null;
  return (
    <div className={styles.execution}>
      {t.executor && <p>执行：{t.executor}</p>}
      {t.dispatchEngine && (
        <p>
          派工覆盖：{t.dispatchEngine}/{t.dispatchModel}/{t.dispatchEffort}
        </p>
      )}
    </div>
  );
}
