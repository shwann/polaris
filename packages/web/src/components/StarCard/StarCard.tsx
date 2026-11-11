import { TaskEditor } from '../LocalEdit/TaskEditor';
import sharedStyles from '../Shared/Shared.module.css';
import styles from './StarCard.module.css';
import { cn } from '../../styles/cn';
import { useEffect, useRef } from 'react';
import { useBoard } from '../../hooks/useBoard';
import { selectedTask } from '../../domain/viewModels';
import { laneInfo } from '../../domain/lanes';
import { ageText, fmt } from '../../domain/time';
import { uiStore } from '../../store/uiStore';
import { pickOnBoard } from '../../hooks/skyBridge';
import { Needs } from '../Shared/Shared';

import { vars } from '../../styles/style';
export function moveStarCard(x: number, y: number) {
  const card = document.getElementById('starcard');
  if (!card || card.hidden) return;
  if (innerWidth <= 560) {
    card.style.visibility = '';
    const bar = document.getElementById('skybar');
    if (bar) card.style.bottom = innerHeight - bar.offsetTop + 10 + 'px';
    return;
  }
  card.style.bottom = '';
  card.style.visibility = x < -10 || y < -10 || x > innerWidth + 10 || y > innerHeight + 10 ? 'hidden' : '';
  const cw = card.offsetWidth,
    ch = card.offsetHeight,
    m = 16;
  let left = x + 26,
    top = y - 24;
  if (left + cw > innerWidth - m) left = x - 26 - cw;
  left = Math.max(m, Math.min(left, innerWidth - cw - m));
  top = Math.max(m, Math.min(top, innerHeight - ch - 90));
  card.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}
export function StarCard() {
  const { view, ui } = useBoard(),
    t = selectedTask(view, ui.selected),
    ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ui.selected && !t) uiStore.setState({ selected: null });
  }, [ui.selected, t]);
  if (!t) return <div id="starcard" hidden />;
  const l = laneInfo(t.lane),
    [age, late] = t.lane === 'waiting' ? ageText(t) : ['', false];
  return (
    <div
      ref={ref}
      id="starcard"
      className={cn(styles.starcard, 'hud')}
      role="dialog"
      aria-label="任务详情"
      tabIndex={-1}
      style={vars({ '--c': `var(${l.c})` })}
      data-sky-block
    >
      <div className={styles['sc-top']}>
        <span className={styles['sc-code']}>{t.code}</span>
        <span className={styles['sc-lane']}>{l.name}</span>
        <button
          type="button"
          className={styles['sc-x']}
          aria-label="关闭"
          onClick={() => uiStore.setState({ selected: null })}
        >
          ×
        </button>
      </div>
      <h3>{t.title}</h3>
      <div className={styles['sc-meta']}>
        {t.status && <span>{t.status}</span>}
        {age ? (
          <span className={cn(late && styles.late)}>{age}</span>
        ) : (
          t.updatedAt && <span>更新 {fmt(t.updatedAt, true)}</span>
        )}
        {t.shippedIn && <span>随 {t.shippedIn} 上线</span>}
        {t.targetRelease && <span>候选 {t.targetRelease}</span>}
        {t.unverified && <span className={styles.late}>待实证：{t.unverified}</span>}
      </div>
      {t.detail && <p className={styles['sc-detail']}>{t.detail}</p>}
      <TaskEditor task={t} />
      <Needs className={styles.needs} text={t.needs} />
      <button
        id="star-go"
        type="button"
        className={cn(sharedStyles.btn, styles.btn, styles['sc-go'])}
        onClick={() => pickOnBoard(t.id)}
      >
        在看板中查看 →
      </button>
    </div>
  );
}
