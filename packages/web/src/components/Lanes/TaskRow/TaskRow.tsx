import { waitingOnOf, type WaitingOn } from '@polaris/core';
import { EditToggle, TaskEditor, useTaskEdit } from '../../LocalEdit/TaskEditor';
import styles from './TaskRow.module.css';
import sharedStyles from '../../Shared/Shared.module.css';
import { cn } from '../../../styles/cn';
import type { Task } from '../../../domain/types';
import { laneInfo } from '../../../domain/lanes';
import { ageText, fmt } from '../../../domain/time';
import { locateStar } from '../../../hooks/skyBridge';
import { Clamp, Needs, RefLine } from '../../Shared/Shared';
import { useEffect, useRef, useState } from 'react';

import { vars } from '../../../styles/style';
/** True when a one-line chip had to cut its text with an ellipsis. */
function useCut(text?: string) {
  const ref = useRef<HTMLSpanElement>(null),
    [cut, setCut] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setCut(node.scrollWidth > node.clientWidth + 1);
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(node);
    return () => ro?.disconnect();
  }, [text]);
  return [ref, cut] as const;
}
/** Waiting cards take their section's colour: 等你 coral, 等客户 amber, 等前置 slate. */
export const WAIT_COLORS: Record<WaitingOn, string> = { user: '--coral', customer: '--amber', dependency: '--slate' };
export function TaskRow({ task: t, changed }: { task: Task; changed: boolean }) {
  const wait = waitingOnOf(t),
    tone = t.lane === 'waiting' && wait ? WAIT_COLORS[wait] : laneInfo(t.lane).c,
    // 等前置 cards stay compact: code, title, status and the ask line only.
    compact = t.lane === 'waiting' && wait === 'dependency',
    [age, lateAge] = t.lane === 'waiting' ? ageText(t) : ['', false],
    late = lateAge && wait === 'user',
    edit = useTaskEdit(),
    [chip, chipCut] = useCut(t.status),
    // A status cut to one line is shown in full when the body is expanded.
    extra = chipCut ? `状态：${t.status}` : undefined,
    body = [t.steps.map((s) => s.name).join(' → '), t.detail].filter(Boolean).join(' · ');
  return (
    <div
      data-id={t.id}
      data-task-row
      className={cn(styles.row, changed && sharedStyles.changed, late && styles.late, compact && styles.compact)}
      style={vars({ '--c': `var(${tone})` })}
      data-wait={t.lane === 'waiting' ? wait : undefined}
      data-sky-block
      onKeyDown={edit.onKeyDown}
    >
      <div className={styles.code}>{t.code}</div>
      <div className={styles.body}>
        <div className={styles.title}>{t.title}</div>
        {!compact && (body || extra) && <Clamp className={styles.detail} id={t.id + ':d'} text={body} extra={extra} />}
        <TaskEditor task={t} open={edit.open} />
        <Needs text={t.needs} wait={wait} />
        {!compact && <RefLine parts={[t.owner, t.ref]} reference={t.ref} />}
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
        <EditToggle edit={edit} code={t.code} />
        {!compact && t.unverified && (
          <span className={styles.chip} style={vars({ '--c': 'var(--amber)' })} title={`待实证：${t.unverified}`}>
            待实证
          </span>
        )}
        {t.status && (
          <span ref={chip} className={styles.chip} title={t.status}>
            {t.status}
          </span>
        )}
        {compact ? null : age ? (
          <span className={cn(styles.age, late && styles.late)}>{age}</span>
        ) : (
          t.updatedAt && <span className={styles.when}>{fmt(t.updatedAt, true)}</span>
        )}
        {!compact && (t.shippedIn || t.targetRelease) && (
          <span className={styles.ship}>{t.shippedIn ? `随 ${t.shippedIn}` : `候选 ${t.targetRelease}`}</span>
        )}
      </div>
    </div>
  );
}
