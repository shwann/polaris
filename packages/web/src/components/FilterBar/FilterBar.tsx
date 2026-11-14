import styles from './FilterBar.module.css';
import { cn } from '../../styles/cn';
import { useSearch } from '../../hooks/useSearch';
import { useBoard } from '../../hooks/useBoard';
import { matchCount } from '../../domain/viewModels';
import { uiStore } from '../../store/uiStore';

import { vars } from '../../styles/style';
export function FilterBar() {
  const { view, ui, data } = useBoard(),
    search = useSearch();
  return (
    <div
      id="filter"
      className={cn(styles.tools, 'hud', !data.booted && 'boot')}
      style={vars({ '--d': 8 })}
      role="search"
      data-sky-block
    >
      <span className={styles.tag}>FILTER</span>
      <input
        type="search"
        value={search.draft}
        placeholder="搜索编号、标题、说明，例如 HOST2 或 发版"
        aria-label="搜索任务"
        onChange={(e) => search.change(e.target.value)}
      />
      <button
        className={styles.tg}
        type="button"
        aria-pressed={ui.mineOnly}
        onClick={() => uiStore.setState({ mineOnly: !ui.mineOnly })}
      >
        只看需要我的
      </button>
      <span className={styles.hits}>{matchCount(view, ui)}</span>
    </div>
  );
}
