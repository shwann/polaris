import styles from './AppPanel.module.css';
import { cn } from '../../../styles/cn';
import type { ReactNode } from 'react';
import type { BoardView } from '../../../domain/types';
import { appPanelModel } from '../../../domain/viewModels';
import { laneInfo } from '../../../domain/lanes';
import { TaskList } from '../TaskList/TaskList';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles['dc-sec']}>
      <h4>{title}</h4>
      {children}
    </section>
  );
}
export function AppPanel({ view: v }: { view: BoardView }) {
  const { a, cur, ship, plan, unv, next, np, appText, backendText, releases } = appPanelModel(v);
  return (
    <>
      <p className={styles['dc-sub']}>你现在实际在用的正式 App · 星图上实线连这一版、虚线连下一版</p>
      <div className={styles['dc-body']}>
        {a ? (
          <Section title="现在跑的是什么">
            <dl className={styles['dc-kv']}>
              <dt>App</dt>
              <dd>{appText}</dd>
              {a.backend && (
                <>
                  <dt>{a.backendLabel || '后端'}</dt>
                  <dd className={cn(a.backend !== cur && styles.warn)}>{backendText}</dd>
                </>
              )}
              {a.skill && (
                <>
                  <dt>Skill</dt>
                  <dd>{a.skill}</dd>
                </>
              )}
              {a.model && (
                <>
                  <dt>模型</dt>
                  <dd>{a.model}</dd>
                </>
              )}
            </dl>
          </Section>
        ) : (
          v.appNote && (
            <Section title="现在跑的是什么">
              <p className={styles['dc-sub']}>{v.appNote}</p>
            </Section>
          )
        )}
        <Section title={`这一版带了什么 · ${ship.length} 项`}>
          {ship.length ? (
            <TaskList
              items={ship}
              right={(t) => (t.unverified ? '待实证' : '已上线')}
              warning={(t) => !!t.unverified}
            />
          ) : (
            <p className={styles['dc-sub']}>还没有任务标记为随这一版上线</p>
          )}
          {plan && (
            <p className={styles['dc-sub']}>
              发版计划 {plan.code} · {plan.status}
            </p>
          )}
        </Section>
        {!!unv.length && (
          <Section title={`上线后待实证 · ${unv.length} 项`}>
            <TaskList
              items={unv}
              text={(t) => t.unverified}
              right={(t) => (t.shippedIn ? '随 ' + t.shippedIn : '')}
              warning={() => true}
            />
          </Section>
        )}
        {a?.next ? (
          <Section title={`下一版 ${a.next} 候选 · ${next.length} 项`}>
            {!!next.length && <TaskList items={next} right={(t) => laneInfo(t.lane).name.replace('已合入、', '')} />}
            <p className={styles['dc-sub']}>
              {[a.nextNote, np && `发版计划 ${np.code} · ${np.status}`].filter(Boolean).join(' · ')}
            </p>
          </Section>
        ) : (
          v.nextRelease && (
            <Section title="下一版">
              <p className={styles['dc-sub']}>{v.nextRelease}</p>
            </Section>
          )
        )}
        {!!v.releases.length && (
          <Section title={`发版轨迹 · ${v.releases.length} 版${a?.rollback ? ' · 可回滚到 ' + a.rollback : ''}`}>
            <ol className={styles['dc-tl']}>
              {releases.map((r) => (
                <li key={r.version} className={cn(r.current && styles.cur)} title={r.title}>
                  <b>{r.version}</b>
                  <span>{r.date}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}
      </div>
    </>
  );
}
