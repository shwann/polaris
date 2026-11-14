import { RELEASE_TAG_LABELS, releaseDetails, waitingOnOf } from '@polaris/core';
import { skyNames } from '../../sky/taskNames';
import { getEngine } from '../../hooks/skyBridge';
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
import { TaskExecution } from '../TaskExecution/TaskExecution';

import { placeCard, type CardSide } from '../../sky/geometry/cardPlacement';
import type { Box } from '../../sky/types';
import { vars } from '../../styles/style';
import { ReleaseCard } from './ReleaseCard';
import { TaskFacts } from './TaskFacts';
export function moveStarCard(x: number, y: number, cluster: Box = [x, y, x, y]) {
  const card = document.getElementById('starcard');
  if (!card || card.hidden) return;
  card.style.maxHeight = innerWidth > 560 ? Math.max(120, innerHeight - 148) + 'px' : '';
  card.style.overflow = innerWidth > 560 ? 'auto' : '';
  if (innerWidth <= 560) {
    card.style.visibility = '';
    const bar = document.getElementById('skybar');
    if (bar) card.style.bottom = innerHeight - bar.offsetTop + 10 + 'px';
    return;
  }
  card.style.bottom = '';
  card.style.visibility = x < -10 || y < -10 || x > innerWidth + 10 || y > innerHeight + 10 ? 'hidden' : '';
  const same = card.dataset.layoutId === card.dataset.starId;
  const placement = placeCard(
    [x, y],
    cluster,
    [card.offsetWidth, card.offsetHeight],
    [innerWidth, innerHeight - 74],
    same ? (card.dataset.side as CardSide | undefined) : undefined,
    getEngine()?.hubObstacles(),
  );
  card.dataset.layoutId = card.dataset.starId;
  card.dataset.side = placement.side;
  card.style.transform = `translate(${Math.round(placement.left)}px, ${Math.round(placement.top)}px)`;
  if (
    x > placement.left - 26 &&
    x < placement.left + card.offsetWidth + 26 &&
    y > placement.top - 26 &&
    y < placement.top + card.offsetHeight + 26
  )
    card.style.visibility = 'hidden';
  return placement.pan;
}
export function StarCard() {
  const { view, ui } = useBoard(),
    t = selectedTask(view, ui.selected),
    releases = releaseDetails(
      view.releases,
      view.tasks.filter((t) => t.systemKey === view.system.key),
    ),
    release = releases.find((r) => r.version === ui.selectedRelease),
    ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if ((ui.selected && !t) || (ui.selectedRelease && !release))
      uiStore.setState({ selected: null, selectedRelease: null, deliveryVersion: null });
  }, [ui.selected, ui.selectedRelease, t, release]);
  if (release) return <ReleaseCard release={release} />;
  if (!t) return <div id="starcard" hidden />;
  const l = laneInfo(t.lane),
    shipped = releases.find((r) => r.version === t.shippedIn),
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
      data-star-id={t.id}
      data-sky-block
    >
      <div className={styles['sc-top']}>
        <span className={styles['sc-code']}>
          {ui.deliveryVersion ? t.code : ui.sky ? skyNames(view.tasks).get(t.id) : t.code}
        </span>
        <span className={styles['sc-lane']}>{l.name}</span>
        <button
          type="button"
          className={styles['sc-x']}
          aria-label="关闭"
          onClick={() => uiStore.setState({ selected: null, deliveryVersion: null })}
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
        {t.shippedIn && (
          <span>
            上线于 {t.shippedIn}
            {shipped &&
              `（${shipped.tag ? RELEASE_TAG_LABELS[shipped.tag] + '，' : ''}${fmt(shipped.releasedAt, true)}）`}
          </span>
        )}
        {t.targetRelease && <span>候选 {t.targetRelease}</span>}
        {t.unverified && <span className={styles.late}>待实证：{t.unverified}</span>}
      </div>
      {t.detail && <p className={styles['sc-detail']}>{t.detail}</p>}
      <TaskExecution task={t} />
      <TaskFacts task={t} />
      <TaskEditor task={t} />
      <Needs className={styles.needs} text={t.needs} wait={waitingOnOf(t)} />
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
