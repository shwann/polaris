import { RELEASE_TAG_LABELS, releaseSummary, type Release } from '@polaris/core';
import { goRelease, selectFromSky, selectRelease } from '../../hooks/skyBridge';
import { fmt } from '../../domain/time';
import { cn } from '../../styles/cn';
import { vars } from '../../styles/style';
import sharedStyles from '../Shared/Shared.module.css';
import styles from './StarCard.module.css';
import releaseStyles from './ReleaseCard.module.css';

/** Release and task details share one HUD shell and the same moving anchor. */
export function ReleaseCard({ release: r }: { release: Release }) {
  const items = r.items ?? [],
    stats = r.stats;
  return (
    <div
      id="starcard"
      className={cn(styles.starcard, 'hud')}
      role="dialog"
      aria-label="版本详情"
      tabIndex={-1}
      style={vars({ '--c': 'var(--lane-app)' })}
      data-star-id={`release:${r.version}`}
      data-release-version={r.version}
      data-sky-block
    >
      <div className={styles['sc-top']}>
        <span className={styles['sc-code']}>{r.version}</span>
        <span className={styles['sc-lane']}>{r.tag ? RELEASE_TAG_LABELS[r.tag] : '发布'}</span>
        <button type="button" className={styles['sc-x']} aria-label="关闭" onClick={() => selectRelease(null)}>
          ×
        </button>
      </div>
      <time className={releaseStyles.time} dateTime={r.releasedAt}>
        发布于 {fmt(r.releasedAt)}
      </time>
      <h3>{releaseSummary(r) || '（未填写简介）'}</h3>
      <div className={styles['sc-meta']}>
        <span>交付 {items.length} 项</span>
        <span>新功能 {stats?.features ?? items.filter((t) => t.kind === 'feature').length}</span>
        <span>修复 {stats?.fixes ?? items.filter((t) => t.kind === 'fix').length}</span>
        <span>待实证 {stats?.unverified ?? 0}</span>
        <span>回滚点 {stats?.rollback || '—'}</span>
      </div>
      {!!items.length && (
        <ul className={releaseStyles.items}>
          {items.slice(0, 8).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                title={`${item.code} ${item.title}`}
                aria-label={`${item.code} ${item.title}`}
                onClick={() => selectFromSky(item.id, r.version)}
              >
                <code>{item.code}</code>
                <span>{item.title}</span>
              </button>
            </li>
          ))}
          {items.length > 8 && <li className={releaseStyles.more}>+{items.length - 8}</li>}
        </ul>
      )}
      <button
        type="button"
        className={cn(sharedStyles.btn, styles.btn, styles['sc-go'])}
        onClick={() => goRelease(r.version)}
      >
        在看板查看发布记录
      </button>
    </div>
  );
}
