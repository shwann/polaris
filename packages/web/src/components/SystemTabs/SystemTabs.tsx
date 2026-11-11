import styles from './SystemTabs.module.css';
import { useEffect, useRef, useState } from 'react';
import { useBoard } from '../../hooks/useBoard';
import { selectSystem } from '../../store/uiStore';
import { tabsModel } from '../../domain/viewModels';

export function SystemTabs() {
  const { view, data } = useBoard(),
    [adding, setAdding] = useState(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className={styles.systems} role="tablist" aria-label="系统">
      <button type="button" role="tab" aria-selected={view.systemKey === 'all'} onClick={() => selectSystem('all')}>
        全部
      </button>
      {tabsModel(view, data.snapshot).map((x) => {
        const c = x.completion;
        return (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={view.systemKey === x.key}
            onClick={() => selectSystem(x.key)}
          >
            <span className={styles.c}>✦ {x.constellation || '星座'}</span>
            <span>{x.name || x.key}</span>
            <span className={styles.n}>
              {c.done}/{c.total}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        className={styles.add}
        title="要加入新系统，告诉 Claude 系统名称，它会建好对应的星座"
        onClick={() => {
          setAdding(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setAdding(false), 2600);
        }}
      >
        {adding ? '告诉 Claude 系统名称即可加入' : '＋ 其他系统'}
      </button>
    </div>
  );
}
