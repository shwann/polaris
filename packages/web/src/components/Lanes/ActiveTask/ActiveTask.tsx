import { waitingOnOf } from '@polaris/core';
import { EditToggle, TaskEditor, useTaskEdit } from '../../LocalEdit/TaskEditor';
import styles from './ActiveTask.module.css';
import sharedStyles from '../../Shared/Shared.module.css';
import { cn } from '../../../styles/cn';
import type { Task } from '../../../domain/types';
import { taskProgress } from '../../../domain/selectors';
import { fmt } from '../../../domain/time';
import { locateStar } from '../../../hooks/skyBridge';
import { Clamp, Count, Needs, RefLine } from '../../Shared/Shared';
import { TaskExecution } from '../../TaskExecution/TaskExecution';

const stepLabels = { done: '已完成', doing: '执行中', blocked: '受阻', todo: '未开始' };
const stepMarks = { done: '✓', doing: '◆', blocked: '!', todo: '○' };
export function ActiveTask({ task: t, changed }: { task: Task; changed: boolean }) {
  const pct = taskProgress(t),
    edit = useTaskEdit();
  return (
    <article
      data-id={t.id}
      data-active-task
      className={cn(styles.active, 'hud', changed && sharedStyles.changed)}
      data-sky-block
      onKeyDown={edit.onKeyDown}
    >
      <div className={styles['a-top']}>
        <span className={styles['a-code']}>{t.code}</span>
        <span className={styles['a-title']}>{t.title}</span>
        <button
          type="button"
          className={cn(sharedStyles.locate, styles.locate)}
          aria-label={`在星图中定位 ${t.code} ${t.title}`}
          onClick={() => locateStar(t.id)}
        >
          ✦ 星图定位
        </button>
        <EditToggle edit={edit} code={t.code} />
        {pct !== null && (
          <span className={styles['a-pct']} title="任务进度">
            <Count id={'pct:' + t.id} value={pct} />
            <small>%</small>
          </span>
        )}
      </div>
      {t.steps.length ? (
        <ol className={styles.steps} aria-label="执行步骤" role="list">
          {t.steps.map((step, i) => (
            <li key={i} className={styles.step} data-state={step.state}>
              <span className={styles.mark} aria-hidden="true">
                <span>{stepMarks[step.state]}</span>
              </span>
              <b>{step.name}</b>
              <span className={styles.state}>{stepLabels[step.state]}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.fallback}>
          <span>未录入步骤</span>
          {t.status && <b>{t.status}</b>}
        </div>
      )}
      {t.detail && <Clamp className={styles['a-detail']} id={t.id + ':d'} text={t.detail} />}
      <TaskExecution task={t} />
      <TaskEditor task={t} open={edit.open} />
      <Needs text={t.needs} wait={waitingOnOf(t)} />
      <RefLine parts={[t.owner, t.ref, fmt(t.updatedAt)]} reference={t.ref} />
    </article>
  );
}
