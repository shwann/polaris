import { TaskEditor } from '../../LocalEdit/TaskEditor';
import styles from './TaskRow.module.css';
import sharedStyles from '../../Shared/Shared.module.css';
import { cn } from '../../../styles/cn';
import type { Task } from '../../../domain/types';
import { laneInfo } from '../../../domain/lanes';
import { ageText, fmt } from '../../../domain/time';
import { locateStar } from '../../../hooks/skyBridge';
import { Clamp, Needs, RefLine } from '../../Shared/Shared';

import { vars } from '../../../styles/style';
export function TaskRow({ task: t, changed }: { task: Task; changed: boolean }) {
  const l = laneInfo(t.lane),
    [age, late] = t.lane === 'waiting' ? ageText(t) : ['', false];
  return (
    <div
      data-id={t.id}
      data-task-row
      className={cn(styles.row, changed && sharedStyles.changed, late && styles.late)}
      style={vars({ '--c': `var(${l.c})` })}
      data-sky-block
    >
      <div className={styles.code}>{t.code}</div>
      <div className={styles.body}>
        <div className={styles.title}>{t.title}</div>
        {!!t.steps.length && <p className={styles.detail}>{t.steps.map((s) => s.name).join(' → ')}</p>}
        {t.detail && <Clamp className={styles.detail} id={t.id + ':d'} text={t.detail} />}
        <TaskEditor task={t} />
        <Needs text={t.needs} />
        <RefLine parts={[t.owner, t.ref]} reference={t.ref} />
      </div>
      <div className={styles.right}>
        <button
          type="button"
          className={sharedStyles.locate}
          aria-label={`在星图中定位 ${t.code} ${t.title}`}
          onClick={() => locateStar(t.id)}
        >
          ✦ 星图定位
        </button>
        {t.unverified && (
          <span className={styles.chip} style={vars({ '--c': 'var(--amber)' })}>
            待实证
          </span>
        )}
        {t.status && <span className={styles.chip}>{t.status}</span>}
        {age ? (
          <span className={cn(styles.age, late && styles.late)}>{age}</span>
        ) : (
          t.updatedAt && <span className={styles.when}>{fmt(t.updatedAt, true)}</span>
        )}
        {(t.shippedIn || t.targetRelease) && (
          <span className={styles.when}>{t.shippedIn ? `随 ${t.shippedIn}` : `候选 ${t.targetRelease}`}</span>
        )}
      </div>
    </div>
  );
}
