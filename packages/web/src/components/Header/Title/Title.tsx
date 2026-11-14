import styles from './Title.module.css';
import { useLayout } from '../../../hooks/useLayout';

export function Title() {
  return (
    <>
      <div className={styles.kicker} ref={useLayout('kicker', true)}>
        研发总览
      </div>
      <h1 className={styles.title}>
        <span className={styles.en} ref={useLayout('en', true)}>
          POLARIS
        </span>
        <span className={styles.zh} ref={useLayout('zh', true)}>
          北辰
        </span>
        <span className={styles.motto} ref={useLayout('motto', true)}>
          所有系统的任务、决定与发版
        </span>
      </h1>
    </>
  );
}
