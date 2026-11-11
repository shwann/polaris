import styles from './GroupPanel.module.css';
import { PanelList } from '../TaskList/TaskList';
import type { Task, Lane } from '../../../domain/types';
import { groupItems, groupNote } from '../../../domain/viewModels';
import { selectStar } from '../../../hooks/skyBridge';
import { useUI } from '../../../hooks/useBoard';

export function GroupPanel({ items: list, all }: { items: Task[]; lane: Lane; all: boolean }) {
  const u = useUI();
  return (
    <>
      <p className={styles['dc-sub']}>{groupNote(list.length, all)}</p>
      <PanelList>
        {groupItems(list, all).map(({ task: t, late, right }) => (
          <li key={t.id}>
            <button
              type="button"
              data-selected={u.selected === t.id}
              title={`${t.code} ${t.title}`}
              onClick={(e) => selectStar(t.id, e.detail === 0)}
            >
              <span data-code>{t.code}</span>
              <span data-title>{t.title}</span>
              <span data-right data-late={late}>
                {right}
              </span>
            </button>
          </li>
        ))}
      </PanelList>
    </>
  );
}
