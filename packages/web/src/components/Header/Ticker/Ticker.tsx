import styles from './Ticker.module.css';
import { cn } from '../../../styles/cn';
import { useData } from '../../../hooks/useBoard';
import { useLayout } from '../../../hooks/useLayout';
import { fmt } from '../../../domain/time';
import { scrollToNode } from '../../../hooks/skyBridge';

export function Ticker() {
  const d = useData(),
    it = d.snapshot?.events[0];
  return (
    <button
      key={d.logRevision}
      className={cn(styles.ticker, d.logRevision > 0 && styles.new)}
      type="button"
      title={it?.text || '看最近动态'}
      ref={useLayout('ticker')}
      onClick={() => scrollToNode(document.getElementById('activity'))}
    >
      <i aria-hidden="true" />
      <span className={styles['tk-k']}>最新</span>
      <time>{it && !isNaN(+new Date(it.at)) ? fmt(it.at, true) : ''}</time>
      <span className={styles['tk-t']}>{it?.text || (d.snapshot ? '还没有动态' : '读取中…')}</span>
    </button>
  );
}
