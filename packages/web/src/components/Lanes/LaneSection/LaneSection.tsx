import styles from './LaneSection.module.css';
import { cn } from '../../../styles/cn';
import { useRef, useEffect } from 'react';
import type { LaneModel } from '../../../domain/laneModel';
import { TaskRow } from '../TaskRow/TaskRow';
import { ActiveTask } from '../ActiveTask/ActiveTask';

import { vars } from '../../../styles/style';
import { WAITING_ON_LABELS } from '@polaris/core';
import { WAIT_COLORS } from '../TaskRow/TaskRow';
export function LaneSection({
  model: m,
  changed,
  booted,
  two = false,
}: {
  model: LaneModel;
  changed: Set<string>;
  booted: boolean;
  /** Lay the cards out in two row-major columns (full-width waiting group). */
  two?: boolean;
}) {
  const root = useRef<HTMLDetailsElement>(null),
    older = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (m.expanded) {
      if (root.current) root.current.open = true;
      if (older.current) older.current.open = true;
    }
  }, [m.expanded]);
  const head = (
    <h2
      id={'lane-' + m.lane.key}
      data-lane-heading
      className={styles['lane-h']}
      style={vars({ '--c': `var(${m.lane.c})` })}
    >
      <span className={styles.bar} />
      <span className={styles.name}>{m.lane.name}</span>
      <span className={styles.n}>{m.list.length}</span>
      {m.hint && <span className={styles.hint}>{m.hint}</span>}
    </h2>
  );
  const rows = (list: typeof m.list, c = m.lane.c) => (
    <div className={cn(styles.rows, two && styles.two, 'hud')} style={vars({ '--c': `var(${c})` })} data-sky-block>
      {list.map((t) => (
        <TaskRow key={t.id} task={t} changed={changed.has(t.id)} />
      ))}
    </div>
  );
  const body = m.parts ? (
    <div className={styles.parts}>
      {m.parts.map((p) => (
        <div key={p.key} className={styles.part} data-wait={p.key} data-wait-section>
          <h3 className={styles.sub} style={vars({ '--c': `var(${WAIT_COLORS[p.key]})` })}>
            <span>{WAITING_ON_LABELS[p.key]}</span>
            <span className={styles['sub-n']}>{p.list.length}</span>
          </h3>
          {rows(p.list, WAIT_COLORS[p.key])}
        </div>
      ))}
    </div>
  ) : m.lane.key === 'doing' ? (
    <div style={{ display: 'grid', gap: '0.8rem' }}>
      {m.list.map((t) => (
        <ActiveTask key={t.id} task={t} changed={changed.has(t.id)} />
      ))}
    </div>
  ) : (
    <div
      className={cn(styles.rows, two && styles.two, 'hud')}
      style={vars({ '--c': `var(${m.lane.c})` })}
      data-sky-block
    >
      {m.recent.map((t) => (
        <TaskRow key={t.id} task={t} changed={changed.has(t.id)} />
      ))}
      {!!m.older.length && (
        <details ref={older} className={styles.older}>
          <summary>更早完成的 {m.older.length} 项（3 天前）</summary>
          {m.older.map((t) => (
            <TaskRow key={t.id} task={t} changed={changed.has(t.id)} />
          ))}
        </details>
      )}
    </div>
  );
  return m.lane.collapsed ? (
    <details ref={root} className={cn(styles.done, !booted && 'boot')} style={vars({ '--d': m.delay })}>
      <summary>{head}</summary>
      {body}
    </details>
  ) : (
    <section className={cn(!booted && 'boot')} style={vars({ '--d': m.delay })}>
      {head}
      {body}
    </section>
  );
}
