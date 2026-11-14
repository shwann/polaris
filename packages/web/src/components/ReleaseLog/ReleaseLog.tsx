import { useState } from 'react';
import { RELEASE_TAG_LABELS, releaseDetails, releaseSummary } from '@polaris/core';
import styles from './ReleaseLog.module.css';
import { cn } from '../../styles/cn';
import { vars } from '../../styles/style';
import { useBoard } from '../../hooks/useBoard';
import { releaseNodeId } from '../../hooks/skyBridge';
import { uiStore } from '../../store/uiStore';
import { SectionHeading } from '../Shared/Shared';
import { fmt } from '../../domain/time';

export function ReleaseLog() {
  const { view, data, ui } = useBoard();
  const [all, setAll] = useState(false);
  const releases = releaseDetails(
    view.releases,
    view.tasks.filter((t) => t.systemKey === view.system.key),
  ).reverse();
  const expanded = all || releases.findIndex((r) => r.version === ui.releaseFocus) >= 6;
  return (
    <section
      id="release-log"
      className={cn(styles.panel, 'hud', !data.booted && 'boot')}
      aria-labelledby="release-log-h"
      data-sky-block
    >
      <div className={styles.heading}>
        <SectionHeading id="release-log-h">发布记录</SectionHeading>
        <span>{releases.length} 个版本</span>
      </div>
      <div className={styles.cards}>
        {(expanded ? releases : releases.slice(0, 6)).map((r, i) => {
          const summary = releaseSummary(r);
          return (
            <article
              id={releaseNodeId(r.version)}
              key={r.version}
              className={styles.card}
              data-highlight={ui.releaseFocus === r.version || undefined}
              style={vars({ '--release-fade': Math.max(0.56, 1 - i * 0.065) })}
              aria-label={`发布 ${r.version}`}
            >
              <header className={styles.header}>
                <b className={styles.version}>{r.version}</b>
                {r.tag && (
                  <span className={styles.tag} data-tag={r.tag}>
                    {RELEASE_TAG_LABELS[r.tag]}
                  </span>
                )}
                {i === 0 && <span className={styles.current}>当前线上</span>}
                <time dateTime={r.releasedAt}>{fmt(r.releasedAt, true)}</time>
              </header>
              <p className={cn(styles.summary, !summary && styles.empty)}>{summary || '（未填写简介）'}</p>
              {!!r.items.length && (
                <ul className={styles.items}>
                  {r.items.slice(0, 8).map((item) => (
                    <li key={item.id} title={`${item.code} ${item.title}`}>
                      <code>{item.code}</code>
                      <span>{item.title}</span>
                    </li>
                  ))}
                  {r.items.length > 8 && <li className={styles.more}>+{r.items.length - 8}</li>}
                </ul>
              )}
              <div className={styles.stats}>
                {!!r.stats.features && (
                  <span>
                    新功能 <b>{r.stats.features}</b>
                  </span>
                )}
                {!!r.stats.fixes && (
                  <span>
                    修复 <b>{r.stats.fixes}</b>
                  </span>
                )}
                {!!r.stats.unverified && (
                  <span className={styles.unverified}>
                    待实证 <b>{r.stats.unverified}</b>
                  </span>
                )}
                {r.stats.rollback && (
                  <span>
                    回滚点 <code>{r.stats.rollback}</code>
                  </span>
                )}
                {r.build && (
                  <span>
                    构建号 <code>{r.build}</code>
                  </span>
                )}
              </div>
              {r.ref && (
                <p className={styles.ref} title={r.ref}>
                  {r.ref}
                </p>
              )}
            </article>
          );
        })}
      </div>
      {!releases.length && <p className={styles.empty}>这个系统还没有发布记录</p>}
      {releases.length > 6 && (
        <button
          className={styles.expand}
          type="button"
          aria-expanded={expanded}
          onClick={() => {
            setAll(!expanded);
            uiStore.setState({ releaseFocus: null });
          }}
        >
          {expanded ? '收起' : `展开全部 ${releases.length} 版`}
        </button>
      )}
    </section>
  );
}
