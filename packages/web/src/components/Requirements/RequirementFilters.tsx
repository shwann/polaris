import { REQ_PRIORITIES } from '@polaris/core';
import type { ReqPriority } from '@polaris/core';
import styles from './RequirementFilters.module.css';
import filterStyles from '../FilterBar/FilterBar.module.css';
import sharedStyles from '../Shared/Shared.module.css';
import { cn } from '../../styles/cn';
import type { RequirementFilter } from '../../domain/requirements';

export function RequirementFilters({
  filter,
  onChange,
  shown,
  total,
}: {
  filter: RequirementFilter;
  onChange: (filter: Partial<RequirementFilter>) => void;
  shown: number;
  total: number;
}) {
  return (
    <div className={cn(styles.filters, filterStyles.tools, 'hud')} role="search" aria-label="筛选需求">
      <span className={filterStyles.tag}>FILTER</span>
      <input
        type="search"
        aria-label="搜索需求"
        placeholder="搜索需求编号、标题、正文"
        value={filter.query}
        onChange={(e) => onChange({ query: e.target.value })}
      />
      <select
        className={styles.priority}
        aria-label="需求优先级"
        value={filter.priority}
        onChange={(e) => onChange({ priority: e.target.value as ReqPriority | '' })}
      >
        <option value="">全部优先级</option>
        {REQ_PRIORITIES.map((priority) => (
          <option key={priority}>{priority}</option>
        ))}
      </select>
      <button
        className={filterStyles.tg}
        type="button"
        aria-pressed={filter.gapsOnly}
        onClick={() => onChange({ gapsOnly: !filter.gapsOnly })}
      >
        只看漏项
      </button>
      <button
        className={sharedStyles.btn}
        type="button"
        onClick={() => onChange({ query: '', priority: '', status: '', gapsOnly: false })}
      >
        重置筛选
      </button>
      <span className={filterStyles.hits}>
        {shown} / {total} 条需求
      </span>
    </div>
  );
}
