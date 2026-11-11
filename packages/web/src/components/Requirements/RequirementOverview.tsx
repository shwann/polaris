import { REQ_STATUS_LABELS } from '@polaris/core';
import type { ReqStatus } from '@polaris/core';
import styles from './RequirementOverview.module.css';
import { cn } from '../../styles/cn';
import type { requirementsModel } from '../../domain/requirements';
import { useLayout } from '../../hooks/useLayout';

export function RequirementOverview({
  model,
  status,
  onStatus,
}: {
  model: ReturnType<typeof requirementsModel>;
  status: ReqStatus | '';
  onStatus: (status: ReqStatus | '') => void;
}) {
  return (
    // Registered as the header's lower edge so the sky keeps its header layout, as the figure cards do in the task view.
    <div
      className={cn(styles.overview, 'hud')}
      aria-label="需求状态概况"
      ref={useLayout<HTMLDivElement>('figures')}
      data-sky-block
    >
      {model.counts.map((item) => (
        <button
          type="button"
          key={item.status}
          aria-pressed={status === item.status}
          onClick={() => onStatus(status === item.status ? '' : item.status)}
        >
          <span>{REQ_STATUS_LABELS[item.status]}</span>
          <b>{item.count}</b>
        </button>
      ))}
      <div className={styles.priority}>
        <span>P0</span>
        <b>{model.p0}</b>
      </div>
      <div className={styles.gaps}>
        <span>漏项</span>
        <b>{model.gapCount}</b>
      </div>
    </div>
  );
}
