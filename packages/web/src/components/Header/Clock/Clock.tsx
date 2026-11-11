import styles from './Clock.module.css';
import { cn } from '../../../styles/cn';
import { useClock } from '../../../hooks/useClock';
import { useData } from '../../../hooks/useBoard';
import { useLayout } from '../../../hooks/useLayout';
import { clockText } from '../../../domain/time';

export function Clock() {
  const t = clockText(useClock()),
    d = useData();
  return (
    <>
      <div className={styles.clock} ref={useLayout('clock')}>
        {t.time}
      </div>
      <div className={styles.status} ref={useLayout('status')}>
        <span className={styles.date}>{t.date}</span>
        <span
          className={cn(styles.live, d.connected && styles.on)}
          title={d.origin === 'mirror' ? '线上镜像：本机数据在这个时间的副本，不会自动更新' : undefined}
        >
          <i />
          <span>{d.label}</span>
        </span>
      </div>
    </>
  );
}
