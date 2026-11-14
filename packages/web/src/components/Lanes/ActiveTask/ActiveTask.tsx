import { waitingOnOf } from '@polaris/core';
import { EditToggle, TaskEditor, useTaskEdit } from '../../LocalEdit/TaskEditor';
import styles from './ActiveTask.module.css';
import sharedStyles from '../../Shared/Shared.module.css';
import { cn } from '../../../styles/cn';
import { useEffect, useRef } from 'react';
import type { Task } from '../../../domain/types';
import { taskProgress } from '../../../domain/selectors';
import { fmt } from '../../../domain/time';
import { locateStar } from '../../../hooks/skyBridge';
import { Clamp, Count, Needs, RefLine } from '../../Shared/Shared';
import { TaskExecution } from '../../TaskExecution/TaskExecution';

const words = { done: 'DONE · 完成', doing: 'RUNNING · 进行中', blocked: 'BLOCKED · 受阻', todo: 'QUEUED · 未开始' };
export function ActiveTask({ task: t, changed }: { task: Task; changed: boolean }) {
  const pct = taskProgress(t),
    meter = useRef<HTMLElement>(null),
    edit = useTaskEdit();
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => meter.current?.style.setProperty('--p', pct + '%'));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [pct]);
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
          <span className={styles['a-pct']}>
            <Count id={'pct:' + t.id} value={pct} />
            <small>%</small>
          </span>
        )}
      </div>
      {pct !== null && (
        <div className={styles.meter}>
          <i ref={meter} />
        </div>
      )}
      {!!t.steps.length && (
        <div className={styles.steps}>
          {t.steps.map((step, i) => (
            <div key={i} className={styles.step} data-state={step.state}>
              <em>{words[step.state]}</em>
              <b>{step.name}</b>
            </div>
          ))}
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
