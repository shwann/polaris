import { useState } from 'react';
import styles from './RequirementGaps.module.css';
import { cn } from '../../styles/cn';
import type { requirementGaps } from '../../domain/requirements';
import { pickOnBoard } from '../../hooks/skyBridge';

// A long list of untraced tasks is folded so the requirement pool stays in view.
const FOLD = 8;
export function RequirementGaps({ gaps }: { gaps: ReturnType<typeof requirementGaps> }) {
  const [all, setAll] = useState(false);
  const tasks = all ? gaps.tasks : gaps.tasks.slice(0, FOLD);
  return (
    <section className={cn(styles.gaps, 'hud')} aria-label="漏项">
      <h3>漏项</h3>
      <div className={styles.columns}>
        <div>
          <h4>已确认 / 已排期 / 开发中，未关联任务</h4>
          {gaps.requirements.length ? (
            <ul>
              {gaps.requirements.map((r) => (
                <li key={r.id}>
                  <b>{r.id}</b> {r.title}
                </li>
              ))}
            </ul>
          ) : (
            <p>没有漏项需求。</p>
          )}
        </div>
        <div>
          <h4>未完成且未关联需求的任务</h4>
          {gaps.tasks.length ? (
            <ul>
              {tasks.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => pickOnBoard(t.id)}>
                    {t.code} · {t.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {gaps.tasks.length > FOLD && (
            <button type="button" className={styles.more} onClick={() => setAll(!all)}>
              {all ? '收起 ▴' : `还有 ${gaps.tasks.length - FOLD} 项 · 展开 ▾`}
            </button>
          )}
          {gaps.tasks.length ? null : <p>没有漏项任务。</p>}
        </div>
      </div>
    </section>
  );
}
