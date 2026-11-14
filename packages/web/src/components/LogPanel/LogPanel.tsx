import styles from './LogPanel.module.css';
import { cn } from '../../styles/cn';
import { Fragment } from 'react';
import { useData } from '../../hooks/useBoard';
import { useClock } from '../../hooks/useClock';
import { logModel } from '../../domain/log';
import { Clamp } from '../Shared/Shared';

import { vars } from '../../styles/style';
export function LogPanel() {
  const d = useData(),
    m = logModel(d.snapshot?.events || [], useClock(60000));
  return (
    <aside
      id="activity"
      className={cn(styles.panel, 'hud', !d.booted && 'boot')}
      style={vars({ '--d': 8 })}
      aria-label="最近动态"
      data-sky-block
    >
      <h2>
        <span className={styles.tag}>SYS LOG</span>最近动态
        <span className={styles.today}>
          今日<b>{m.todayN}</b>条
        </span>
      </h2>
      <div className={styles.pulse} aria-hidden="true">
        {m.pulse.map((p, h) => (
          <i
            key={h}
            className={cn(p.on && styles.on, p.now && styles.now)}
            style={vars({ '--h': p.height })}
            title={p.title}
          />
        ))}
      </div>
      <div className={styles['pulse-axis']} aria-hidden="true">
        {['00', '06', '12', '18', '24'].map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <ul className={styles.log}>
        {m.rows.length ? (
          m.rows.map((it) => (
            <Fragment key={it.key}>
              {it.divider && <li className={styles.day}>{it.divider}</li>}
              <li className={cn(it.latest && styles.latest)} style={vars({ '--k': `var(${it.color})` })}>
                <div className={styles.meta}>
                  <span className={styles.kind}>{it.name}</span>
                  <time dateTime={it.at}>{it.time}</time>
                  {it.ago && <span className={styles.ago}>{it.ago}</span>}
                  {it.latest && <span className={styles.new}>LATEST</span>}
                </div>
                <Clamp className={styles.txt} text={it.text} id={'log:' + it.key} lines={it.lines} />
              </li>
            </Fragment>
          ))
        ) : (
          <li>
            <span className={styles.txt}>还没有动态记录。</span>
          </li>
        )}
      </ul>
    </aside>
  );
}
