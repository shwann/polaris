import styles from './ViewSwitch.module.css';
import { useUI } from '../../hooks/useBoard';
import { setView } from '../../store/uiStore';

export function ViewSwitch() {
  const ui = useUI();
  return (
    <div className={styles.switch} role="group" aria-label="看板视图">
      <button type="button" aria-pressed={ui.view === 'tasks'} onClick={() => setView('tasks')}>
        任务
      </button>
      <button type="button" aria-pressed={ui.view === 'reqs'} onClick={() => setView('reqs')}>
        需求
      </button>
    </div>
  );
}
