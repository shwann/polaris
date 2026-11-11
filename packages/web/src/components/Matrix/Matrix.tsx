import styles from './Matrix.module.css';
import { cn } from '../../styles/cn';
import { useState } from 'react';
import { useBoard } from '../../hooks/useBoard';
import { matrixModel } from '../../domain/viewModels';
import { openDip } from '../../store/uiStore';
import { getEngine } from '../../hooks/skyBridge';
import { showTooltip } from '../SkyCanvas/tooltipBridge';

import { vars } from '../../styles/style';
export function Matrix() {
  const { view: v, ui, data } = useBoard(),
    model = matrixModel(v, ui),
    c = model.completion,
    [intro] = useState(!data.booted);
  return (
    <section
      className={cn(styles.ribbon, 'hud', 'boot')}
      style={vars({ '--d': 7 })}
      aria-label="全部任务状态"
      data-sky-block
    >
      <div className={styles['ribbon-h']}>
        <span className={styles.t}>任务矩阵</span>
        <span className={styles.tag}>{model.label} · 一格一项</span>
        <button
          type="button"
          className={styles.ratio}
          title="北辰 · 看总览"
          onClick={(e) => openDip(7, true, e.detail === 0)}
        >
          {c.done}
          <small>/ {c.total} 已完成</small>
        </button>
      </div>
      <div className={cn(styles.cells, intro && styles.intro)} style={vars({ '--n': model.count })}>
        {model.cells.map(({ task: t, index: k, lane, sub, hatch, old, dim }) => {
          return (
            <i
              key={t.id}
              className={cn(hatch && styles.hatch, old && styles.old, dim && styles.dim)}
              style={vars({ '--c': `var(${lane.c})`, '--k': k })}
              aria-label={`${t.code} ${t.title}，${sub}`}
              onPointerMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                getEngine()?.focus(t.id, r.left + r.width / 2, r.top + r.height / 2);
                showTooltip(`${t.code} ${t.title}`, sub, e.clientX, e.clientY);
              }}
              onPointerLeave={() => {
                getEngine()?.focus(null);
                showTooltip('', '', 0, 0);
              }}
            />
          );
        })}
      </div>
      <div className={styles.legend}>
        {model.legend.map(({ lane: l, count }) => {
          return (
            <span key={l.key} style={vars({ '--c': `var(${l.c})` })}>
              {l.name}
              <b>{count}</b>
            </span>
          );
        })}
      </div>
    </section>
  );
}
