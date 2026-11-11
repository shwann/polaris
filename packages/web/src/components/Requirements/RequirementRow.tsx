import { useStore } from 'zustand';
import { dataStore, submitWrite } from '../../store/dataStore';
import { Markdown } from '../Markdown/Markdown';
import { REQ_SOURCE_LABELS, REQ_STATUS_LABELS, REQ_STATUSES } from '@polaris/core';
import type { Requirement, Task } from '@polaris/core';
import styles from './RequirementRow.module.css';
import { cn } from '../../styles/cn';
import { vars } from '../../styles/style';
import { acceptanceProgress, linkedRequirementTasks } from '../../domain/requirements';
import { laneInfo } from '../../domain/lanes';
import { taskProgress } from '../../domain/selectors';
import { pickOnBoard } from '../../hooks/skyBridge';
import { RefLine } from '../Shared/Shared';

export function RequirementRow({
  requirement: r,
  tasks,
  constellation,
}: {
  requirement: Requirement;
  tasks: Task[];
  constellation?: string;
}) {
  const editable = useStore(dataStore, (s) => s.origin === 'local' && Boolean(s.credentials));
  const writing = useStore(dataStore, (s) => s.writing);
  const progress = acceptanceProgress(r),
    linked = linkedRequirementTasks(r, tasks);
  return (
    <details className={cn(styles.row, 'hud')}>
      <summary className={styles.summary}>
        <span className={styles.code}>{r.id}</span>
        <strong className={styles.title}>{r.title}</strong>
        <span className={styles.priority} data-priority={r.priority}>
          {r.priority}
        </span>
        <span>{REQ_SOURCE_LABELS[r.source]}</span>
        {constellation && <span className={styles.scope}>{constellation}</span>}
        {r.scope && <span className={styles.scope}>{r.scope}</span>}
        <span className={styles.acceptance}>
          验收 {progress.met} / {progress.total}
        </span>
        <span className={styles.tasks}>
          {linked.map((t) => (
            <span className={styles.chip} style={vars({ '--c': `var(${laneInfo(t.lane).c})` })} key={t.id}>
              {t.code} · {taskProgress(t) === null ? '—' : `${taskProgress(t)}%`}
            </span>
          ))}
        </span>
      </summary>
      <div className={styles.detail}>
        {editable && (
          <label className={styles.editor}>
            需求状态{' '}
            <select
              aria-label={`${r.id} 状态`}
              value={r.status}
              disabled={writing}
              onChange={(e) =>
                void submitWrite(
                  '/api/req/move',
                  { id: r.id, status: e.target.value },
                  `${r.id} 状态 ${REQ_STATUS_LABELS[e.target.value as Requirement['status']]}`,
                )
              }
            >
              {REQ_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {REQ_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        )}
        {r.body && <Markdown text={r.body} />}
        <h4>验收标准</h4>
        {r.acceptance.length ? (
          <ul className={styles.criteria}>
            {r.acceptance.map((item, i) => (
              <li key={i}>
                {editable ? (
                  <button
                    className={cn(styles.check, item.met ? styles.met : styles.pending)}
                    type="button"
                    aria-label={`${r.id} 验收标准 ${i + 1}`}
                    aria-pressed={item.met}
                    disabled={writing}
                    onClick={() =>
                      void submitWrite(
                        '/api/req/check',
                        { id: r.id, item: i + 1, met: !item.met },
                        `${r.id} 第 ${i + 1} 条验收标准`,
                      )
                    }
                  >
                    {item.met ? '✓' : '○'}
                  </button>
                ) : (
                  <span className={item.met ? styles.met : styles.pending}>{item.met ? '✓' : '○'}</span>
                )}{' '}
                {item.text}
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无验收标准。</p>
        )}
        <h4>关联文档</h4>
        {r.refs.length ? (
          r.refs.map((ref, i) =>
            /^https?:\/\//i.test(ref) ? (
              <a className={styles.reference} key={i} href={ref} target="_blank" rel="noreferrer">
                {ref}
              </a>
            ) : (
              <RefLine key={i} parts={[ref]} reference={ref} />
            ),
          )
        ) : (
          <p>暂无关联文档。</p>
        )}
        <h4>关联任务</h4>
        {linked.length ? (
          <ul>
            {linked.map((t) => (
              <li key={t.id} className={styles.task} style={vars({ '--c': `var(${laneInfo(t.lane).c})` })}>
                <button type="button" onClick={() => pickOnBoard(t.id)}>
                  {t.code} · {t.title}
                </button>
                <span>
                  {laneInfo(t.lane).name} · {t.status} · {taskProgress(t) === null ? '进度未填' : `${taskProgress(t)}%`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无关联任务。</p>
        )}
      </div>
    </details>
  );
}
