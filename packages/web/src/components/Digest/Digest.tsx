import styles from './Digest.module.css';
import { cn } from '../../styles/cn';
import { groupDigest, releaseDigest } from '../../domain/presentation';
import { useBoard } from '../../hooks/useBoard';
import { goLane } from '../../hooks/skyBridge';
import { openDip } from '../../store/uiStore';

import { vars } from '../../styles/style';
export function Digest() {
  const { view } = useBoard(),
    groups = groupDigest(view.tasks),
    releases = releaseDigest(view);
  return (
    <div className={styles.digest}>
      <section
        className={cn(styles.dg, 'hud', 'boot')}
        style={vars({ '--d': 8 })}
        aria-labelledby="dg-g-h"
        data-sky-block
      >
        <h2 id="dg-g-h">任务分组</h2>
        <div className={styles['dg-rows']}>
          {groups.length ? (
            groups.map((r) => (
              <button
                type="button"
                key={r.lane.key}
                className={styles['dg-row']}
                style={vars({ '--c': `var(${r.lane.c})` })}
                title={r.text}
                onClick={() => goLane(r.lane.key)}
              >
                <b>{r.title}</b>
                <span>{r.text}</span>
              </button>
            ))
          ) : (
            <p className={styles.none}>没有需要处理的分组</p>
          )}
        </div>
      </section>
      <section
        className={cn(styles.dg, 'hud', 'boot')}
        style={vars({ '--d': 8 })}
        aria-labelledby="dg-r-h"
        data-sky-block
      >
        <h2 id="dg-r-h">发版动态</h2>
        <div className={styles['dg-rows']}>
          {releases.length ? (
            releases.map((r) => (
              <button
                type="button"
                key={r.title}
                className={styles['dg-row']}
                style={vars({ '--c': `var(${r.color})` })}
                title={r.text}
                onClick={() => openDip(0)}
              >
                <b>{r.title}</b>
                <span>{r.text}</span>
              </button>
            ))
          ) : (
            <p className={styles.none}>这个系统还没有发版记录</p>
          )}
        </div>
      </section>
    </div>
  );
}
