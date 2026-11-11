import { cn } from '../../styles/cn';
import sharedStyles from '../Shared/Shared.module.css';
import styles from './SkyBar.module.css';
import { useBoard } from '../../hooks/useBoard';
import { useLayout } from '../../hooks/useLayout';
import { setInput, setSky } from '../../store/uiStore';
import { filtering, searchTasks } from '../../domain/selectors';
import { getEngine } from '../../hooks/skyBridge';

export function SkyBar() {
  const { view, ui } = useBoard();
  return (
    <div
      id="skybar"
      className={styles.skybar}
      role="dialog"
      aria-label="星图视图"
      ref={useLayout('skybar')}
      data-sky-block
    >
      <b>STAR CHART</b>
      <span className={styles.skyhint}>
        {ui.input === 'pad'
          ? '双指滑动平移 · 双指捏合缩放 · 点星或按 ← → 看详情'
          : '拖动平移 · 滚轮缩放 · 点星或按 ← → 看详情'}
      </span>
      <span className={styles.imode} role="group" aria-label="输入方式">
        <button
          type="button"
          className={cn(sharedStyles.btn, styles.btn)}
          aria-pressed={ui.input === 'mouse'}
          onClick={() => setInput('mouse')}
        >
          鼠标
        </button>
        <button
          type="button"
          className={cn(sharedStyles.btn, styles.btn)}
          aria-pressed={ui.input === 'pad'}
          onClick={() => setInput('pad')}
        >
          触控板
        </button>
      </span>
      <span className={styles.skyfilter} hidden={!filtering(ui)}>
        {filtering(ui) ? `按看板筛选 · 亮 ${searchTasks(view.tasks, ui).length} / ${view.tasks.length}` : ''}
      </span>
      <span className={styles.zoom}>
        <button
          type="button"
          className={cn(sharedStyles.btn, styles.btn)}
          aria-label="缩小"
          onClick={() => getEngine()?.zoom(1 / 1.35)}
        >
          −
        </button>
        <button
          type="button"
          className={cn(sharedStyles.btn, styles.btn)}
          aria-label="放大"
          onClick={() => getEngine()?.zoom(1.35)}
        >
          ＋
        </button>
        <button type="button" className={cn(sharedStyles.btn, styles.btn)} onClick={() => getEngine()?.resetView()}>
          复位
        </button>
      </span>
      <button type="button" id="skyback" className={cn(sharedStyles.btn, styles.btn)} onClick={() => setSky(false)}>
        返回看板 · Esc
      </button>
    </div>
  );
}
