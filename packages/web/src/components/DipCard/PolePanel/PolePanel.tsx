import styles from './PolePanel.module.css';
import { PanelList } from '../TaskList/TaskList';
import { useBoard } from '../../../hooks/useBoard';
import { poleModel } from '../../../domain/viewModels';
import { selectSystem, openDip } from '../../../store/uiStore';

import { vars } from '../../../styles/style';
export function PolePanel() {
  const { view: v, data } = useBoard(),
    m = poleModel(v, data.snapshot);
  return (
    <>
      <p className={styles['dc-sub']}>{m.summary}</p>
      <div className={styles['dc-body']}>
        <PanelList>
          {m.systems.map((x) => (
            <li key={x.key}>
              <button
                type="button"
                data-selected={x.key === v.systemKey}
                style={vars({ '--c': 'var(--amber)' })}
                onClick={() => selectSystem(x.key)}
              >
                <span data-code>{x.constellation || '星座'}</span>
                <span data-title>{x.name || x.key}</span>
                <span data-right>{x.note}</span>
              </button>
            </li>
          ))}
        </PanelList>
        <p className={styles['dc-sub']}>{m.selected}</p>
        <PanelList>
          {m.modules.map(({ star: d, index: k, lane, note }) => (
            <li key={d.en}>
              <button
                type="button"
                style={vars({ '--c': `var(${lane?.c || '--lane-app'})` })}
                onClick={(e) => openDip(k, false, e.detail === 0)}
              >
                <span data-code>
                  {d.gr} {d.zh}
                </span>
                <span data-title>{lane?.name || '正式 App'}</span>
                <span data-right>{note}</span>
              </button>
            </li>
          ))}
        </PanelList>
        {m.latest.map((it) => (
          <p key={it.key} className={styles['dc-sub']}>
            {it.text}
          </p>
        ))}
      </div>
    </>
  );
}
