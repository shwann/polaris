import styles from './TaskList.module.css';
import type { ReactNode } from 'react';
import type { Task } from '../../../domain/types';
import { selectStar } from '../../../hooks/skyBridge';
import { useUI } from '../../../hooks/useBoard';

export function PanelList({ children }: { children: ReactNode }) {
  return <ul className={styles.list}>{children}</ul>;
}

export function TaskList({
  items,
  text = (t) => t.title,
  right = () => '',
  warning = () => false,
}: {
  items: Task[];
  text?: (t: Task) => string | undefined;
  right?: (t: Task) => string;
  warning?: (t: Task) => boolean;
}) {
  const u = useUI();
  return (
    <PanelList>
      {items.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            data-warning={warning(t)}
            data-selected={u.selected === t.id}
            title={`${t.code} ${t.title}${t.unverified ? ' · 待实证：' + t.unverified : ''}`}
            onClick={(e) => selectStar(t.id, e.detail === 0)}
          >
            <span data-code>{t.code}</span>
            <span data-title>{text(t)}</span>
            <span data-right>{right(t)}</span>
          </button>
        </li>
      ))}
    </PanelList>
  );
}
