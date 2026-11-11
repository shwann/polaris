import styles from './LaneSection.module.css';
import { cn } from '../../../styles/cn';
import { useRef, useEffect } from 'react';
import type { LaneModel } from '../../../domain/laneModel';
import { TaskRow } from '../TaskRow/TaskRow';
import { ActiveTask } from '../ActiveTask/ActiveTask';

import { vars } from '../../../styles/style';
export function LaneSection({
  model: m,
  changed,
  booted,
}: {
  model: LaneModel;
  changed: Set<string>;
  booted: boolean;
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
  const body =
    m.lane.key === 'doing' ? (
      <div style={{ display: 'grid', gap: '1rem' }}>
        {m.list.map((t) => (
          <ActiveTask key={t.id} task={t} changed={changed.has(t.id)} />
        ))}
      </div>
    ) : (
      <div
        className={cn(styles.rows, 'hud')}
        style={vars({ '--c': `var(${m.lane.c})`, '--edge-c': `var(${m.lane.c})` })}
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
