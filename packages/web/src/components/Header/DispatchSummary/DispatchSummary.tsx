import { dispatchDate, dispatchLabel, type SystemInfo } from '@polaris/core';
import styles from './DispatchSummary.module.css';

export function DispatchSummary({ systems, all }: { systems: SystemInfo[]; all: boolean }) {
  return (
    <div className={styles.summary}>
      {systems.map((system) => {
        const d = system.dispatch?.current;
        return d ? (
          <p key={system.key} title={d.note}>
            {all ? `${system.constellation} ` : ''}派工 {dispatchLabel(d)} · {dispatchDate(d.setAt)} {d.by}定
          </p>
        ) : null;
      })}
    </div>
  );
}
