import sharedStyles from '../Shared/Shared.module.css';
import styles from './DipCard.module.css';
import { cn } from '../../styles/cn';
import { useEffect, useRef } from 'react';
import { useBoard } from '../../hooks/useBoard';
import { useLayout } from '../../hooks/useLayout';
import { useDipPlacement } from '../../hooks/useDipPlacement';
import { FIG_LANE, laneInfo } from '../../domain/lanes';
import { laneTasks } from '../../domain/selectors';
import { uiStore } from '../../store/uiStore';
import { goLane } from '../../hooks/skyBridge';
import { DipperMark } from '../Figures/DipperMark/DipperMark';
import { AppPanel } from './AppPanel/AppPanel';
import { PolePanel } from './PolePanel/PolePanel';
import { GroupPanel } from './GroupPanel/GroupPanel';

import { vars } from '../../styles/style';
export function DipCard() {
  const { view: v, ui: u, data } = useBoard(),
    ref = useRef<HTMLDivElement>(null),
    register = useLayout<HTMLDivElement>('dipcard'),
    drag = useDipPlacement(ref, u.dip),
    g = FIG_LANE[u.dip],
    lane = g ? laneInfo(g) : null,
    list = g ? laneTasks(v.tasks, g) : [],
    close = () => uiStore.setState({ dip: -1 });
  useEffect(() => {
    if (u.dip >= 0)
      ref.current?.querySelector<HTMLElement>('li button,button[data-go]')?.focus({ preventScroll: true });
  }, [u.dip, u.dipKeyboard]);
  return (
    <div
      id="dipcard"
      data-dipcard
      className={cn(styles.dipcard, 'hud', drag.dragging && styles.dragging)}
      role="dialog"
      aria-label="北斗分组"
      tabIndex={-1}
      hidden={u.dip < 0}
      style={vars({ '--c': `var(${u.dip === 7 ? '--amber' : lane?.c || '--lane-app'})` })}
      ref={(node) => {
        ref.current = node;
        return register(node);
      }}
      data-sky-block
    >
      <div className={styles['dc-head']} onPointerDown={drag.onPointerDown}>
        {u.dip === 7 ? <em>✦ 北辰</em> : <DipperMark index={Math.max(0, u.dip)} />}
        <span className={styles['dc-name']}>{u.dip === 7 ? '总览' : lane?.name || '正式 App'}</span>
        {(lane || u.dip === 7) && (
          <span className={styles['dc-n']}>{u.dip === 7 ? data.snapshot?.tasks.length || 0 : list.length}</span>
        )}
        <button type="button" className={styles['dc-x']} aria-label="关闭" onClick={close}>
          ×
        </button>
      </div>
      {u.dip === 7 ? <PolePanel /> : g ? <GroupPanel items={list} lane={g} all={u.dipAll} /> : <AppPanel view={v} />}
      <div className={styles['dc-foot']}>
        {list.length > 8 && (
          <button
            type="button"
            className={cn(sharedStyles.btn, styles.btn)}
            aria-expanded={u.dipAll}
            onClick={() => uiStore.setState({ dipAll: !u.dipAll })}
          >
            {u.dipAll ? '收起' : `展开全部 ${list.length} 项`}
          </button>
        )}
        <button type="button" className={cn(sharedStyles.btn, styles.btn)} data-go onClick={() => goLane(g || null)}>
          {u.dip === 7 ? '回到看板顶部 →' : '在看板中查看 →'}
        </button>
      </div>
    </div>
  );
}
