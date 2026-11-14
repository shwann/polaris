import styles from './WatchRows.module.css';
import { cn } from '../../../styles/cn';
import { useBoard } from '../../../hooks/useBoard';
import { useLayout } from '../../../hooks/useLayout';
import { watchModel } from '../../../domain/viewModels';
import { uiStore, openDip, setView } from '../../../store/uiStore';
import { scrollToNode } from '../../../hooks/skyBridge';

export function WatchRows() {
  const { view: v, data } = useBoard(),
    m = watchModel(v, data.snapshot);
  return (
    <div className={styles.watch} aria-label="关注" ref={useLayout('watch')}>
      <button
        className={cn(styles['w-row'], styles.me, m.late && styles.late)}
        id="w-me"
        type="button"
        title="只看需要你处理的任务"
        onClick={() => {
          uiStore.setState({ mineOnly: true });
          if (uiStore.getState().view === 'reqs') {
            setView('tasks');
            requestAnimationFrame(() => scrollToNode(document.getElementById('filter')));
          } else scrollToNode(document.getElementById('filter'));
        }}
      >
        <span className={styles.k}>需要你</span>
        <b>{m.me}</b>
        <span className={styles.s}>{m.meNote}</span>
        <i aria-hidden="true">›</i>
      </button>
      <button
        className={styles['w-row']}
        id="w-next"
        type="button"
        title="看正式 App 与下一版"
        onClick={() => openDip(0, true)}
      >
        <span className={styles.k}>下一版</span>
        <b>{m.next}</b>
        <span className={styles.s}>{m.nextNote}</span>
        <i aria-hidden="true">›</i>
      </button>
      <button
        className={styles['w-row']}
        id="pole"
        type="button"
        title="北辰 · 总览：各系统与七个模块"
        onPointerEnter={() => uiStore.setState({ hovered: 7 })}
        onPointerLeave={() => uiStore.setState({ hovered: -1 })}
        onClick={(e) => openDip(7, true, e.detail === 0)}
      >
        <span className={styles.k}>完成</span>
        <b>{m.percent}</b>
        <span className={styles.s}>{m.totalNote}</span>
        <i aria-hidden="true">›</i>
      </button>
    </div>
  );
}
