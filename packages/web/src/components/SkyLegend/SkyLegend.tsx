import styles from './SkyLegend.module.css';
import { useState, type ReactNode } from 'react';
import { COL, LANES } from '../../domain/lanes';
import { LATE_DAYS, RECENT_DAYS } from '../../domain/time';
import type { Lane } from '../../domain/types';
import { useUI } from '../../hooks/useBoard';
import { useLayout } from '../../hooks/useLayout';

/** localStorage key; '0' means the reader folded the legend away. */
export const LEGEND_KEY = 'sky-legend';

export function readLegendOpen() {
  try {
    return localStorage.getItem(LEGEND_KEY) !== '0';
  } catch {
    return true;
  }
}
export function saveLegendOpen(open: boolean) {
  try {
    localStorage.setItem(LEGEND_KEY, open ? '1' : '0');
  } catch {
    /* Private windows may refuse storage; the legend still toggles for this visit. */
  }
}

const rgb = (lane: Lane) => `rgb(${COL[lane].join(',')})`;

/** What draw/stars.ts draws around each group's stars. */
const MARKS: Record<Lane, { text: string; icon: ReactNode }> = {
  doing: {
    text: '环绕轨道',
    icon: (
      <>
        <ellipse cx="9" cy="9" rx="7" ry="3.2" transform="rotate(-23 9 9)" fill="none" stroke="currentColor" />
        <circle cx="9" cy="9" r="2.4" fill="currentColor" />
      </>
    ),
  },
  waiting: {
    text: '向外扩散的圆环',
    icon: (
      <>
        <circle cx="9" cy="9" r="6.5" fill="none" stroke="currentColor" opacity="0.6" />
        <circle cx="9" cy="9" r="2.4" fill="currentColor" />
      </>
    ),
  },
  release: {
    text: '旋转方框',
    icon: (
      <>
        <rect x="3.5" y="3.5" width="11" height="11" fill="none" stroke="currentColor" transform="rotate(20 9 9)" />
        <circle cx="9" cy="9" r="2.2" fill="currentColor" />
      </>
    ),
  },
  risk: {
    text: '闪烁的虚线圈',
    icon: (
      <>
        <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeDasharray="2 2.4" />
        <circle cx="9" cy="9" r="2.2" fill="currentColor" />
      </>
    ),
  },
  planned: { text: '只有圆点', icon: <circle cx="9" cy="9" r="2.4" fill="currentColor" /> },
  done: { text: '小点，偶尔闪光', icon: <circle cx="9" cy="9" r="1.8" fill="currentColor" /> },
};

const Icon = ({ children }: { children: ReactNode }) => (
  <svg className={styles.icon} viewBox="0 0 18 18" aria-hidden="true">
    {children}
  </svg>
);

/** Explains the chart's colours, marks and glows; folds away, and remembers that per browser. */
export function SkyLegend() {
  const ui = useUI(),
    [open, setOpen] = useState(readLegendOpen),
    ref = useLayout('legend');
  const toggle = () => {
    saveLegendOpen(!open);
    setOpen(!open);
  };
  return (
    <aside id="skylegend" className={styles.legend} aria-label="星图图例" hidden={!ui.sky} ref={ref} data-sky-block>
      <button type="button" className={styles.toggle} aria-expanded={open} onClick={toggle}>
        图例 {open ? '▾ 收起' : '▸'}
      </button>
      {open && (
        <ul className={styles.list}>
          {LANES.map((lane) => (
            <li key={lane.key} className={styles.row} style={{ color: rgb(lane.key) }}>
              <Icon>{MARKS[lane.key].icon}</Icon>
              <span className={styles.name}>{lane.name}</span>
              <span className={styles.note}>{MARKS[lane.key].text}</span>
            </li>
          ))}
          <li className={styles.row} style={{ color: rgb('waiting') }}>
            <Icon>
              <circle cx="9" cy="9" r="8" fill="currentColor" opacity="0.25" />
              <circle cx="9" cy="9" r="2.6" fill="currentColor" />
            </Icon>
            <span className={styles.name}>光晕大、闪烁</span>
            <span className={styles.note}>等回复超过 {LATE_DAYS} 天</span>
          </li>
          <li className={styles.row} style={{ color: rgb('done') }}>
            <Icon>
              <circle cx="5" cy="9" r="2.2" fill="currentColor" />
              <circle cx="13" cy="9" r="1.4" fill="currentColor" opacity="0.4" />
            </Icon>
            <span className={styles.name}>亮点 / 暗点</span>
            <span className={styles.note}>{RECENT_DAYS} 天内完成 / 更早</span>
          </li>
          <li className={styles.row} data-gold>
            <Icon>
              <path d="M2 13 L7 6 L12 9 L16 4" fill="none" stroke="currentColor" strokeDasharray="3 2" />
            </Icon>
            <span className={styles.name}>金色七星</span>
            <span className={styles.note}>每颗星一个分组，北辰是总览</span>
          </li>
        </ul>
      )}
    </aside>
  );
}
