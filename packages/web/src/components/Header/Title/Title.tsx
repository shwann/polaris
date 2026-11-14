import styles from './Title.module.css';
import { useLayout } from '../../../hooks/useLayout';

export function Title() {
  return (
    <h1 className={styles.title}>
      <span className={styles.en} ref={useLayout('en', true)}>
        POLARIS
      </span>
      <span className={styles.zh} ref={useLayout('zh', true)}>
        北辰
      </span>
    </h1>
  );
}
