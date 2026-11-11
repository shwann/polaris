import { useEffect } from 'react';
import { useStore } from 'zustand';
import { dataStore, submitWrite } from '../../store/dataStore';
import styles from './WriteNotice.module.css';

export function WriteNotice() {
  const notice = useStore(dataStore, (s) => s.notice);
  const writing = useStore(dataStore, (s) => s.writing);
  useEffect(() => {
    if (!notice || writing) return;
    const timer = setTimeout(() => {
      if (dataStore.getState().notice === notice) dataStore.setState({ notice: null });
    }, 8000);
    return () => clearTimeout(timer);
  }, [notice, writing]);
  if (!notice) return null;
  return (
    <div className={styles.notice} role={notice.error ? 'alert' : 'status'}>
      {notice.text}
      {notice.batch && (
        <button
          type="button"
          disabled={writing}
          onClick={() => void submitWrite('/api/undo', { batch: notice.batch }, '刚才的修改')}
        >
          撤销
        </button>
      )}
    </div>
  );
}
