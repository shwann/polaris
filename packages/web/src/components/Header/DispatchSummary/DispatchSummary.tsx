import {
  DISPATCH_EFFORT_LABELS,
  DISPATCH_ENGINE_LABELS,
  dispatchDate,
  type DispatchSetting,
  type SystemInfo,
} from '@polaris/core';
import { useCallback, useState } from 'react';
import { useStore } from 'zustand';
import { dataStore } from '../../../store/dataStore';
import { DispatchDialog } from '../DispatchDialog/DispatchDialog';
import styles from './DispatchSummary.module.css';

/** Board-only label: shows the effort in Chinese, unlike the CLI's dispatchLabel. */
export function boardDispatchLabel(d: DispatchSetting): string {
  const effort = (DISPATCH_EFFORT_LABELS as Record<string, string>)[d.effort] ?? d.effort;
  return `${DISPATCH_ENGINE_LABELS[d.engine]} ${d.model} / ${effort}`;
}
export function DispatchSummary({ systems, all }: { systems: SystemInfo[]; all: boolean }) {
  const credentials = useStore(dataStore, (s) => s.origin === 'local' && s.credentials);
  const writing = useStore(dataStore, (s) => s.writing);
  const [selected, setSelected] = useState<string | null>(null);
  const close = useCallback(() => setSelected(null), []);
  const editing = systems.find((s) => s.key === selected);
  return (
    <div className={styles.summary}>
      {systems.map((system) => {
        const d = system.dispatch?.current;
        const text = `${all ? `${system.constellation} ` : ''}派工 ${d ? `${boardDispatchLabel(d)} · ${dispatchDate(d.setAt)} ${d.by}定` : '未设置'}`;
        if (credentials && (d || !all))
          return (
            <button
              key={system.key}
              type="button"
              title={d?.note}
              disabled={writing}
              aria-haspopup="dialog"
              onClick={() => setSelected(system.key)}
            >
              {text}
            </button>
          );
        return d ? (
          <p key={system.key} title={d.note}>
            {text}
          </p>
        ) : null;
      })}
      {credentials && editing && <DispatchDialog system={editing} onClose={close} />}
    </div>
  );
}
