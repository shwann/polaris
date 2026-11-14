import { cn } from '../../styles/cn';
import styles from './ViewButtons.module.css';
import sharedStyles from '../Shared/Shared.module.css';
import { useUI } from '../../hooks/useBoard';
import { useFullscreen } from '../../hooks/useFullscreen';
import { setSky, setProjection } from '../../store/uiStore';

import { ViewSwitch } from '../Requirements/ViewSwitch';
import { useLayout } from '../../hooks/useLayout';
export function ViewButtons({ className }: { className?: string }) {
  const u = useUI(),
    full = useFullscreen();
  return (
    <div className={cn(styles['side-row'], className)} ref={useLayout('actions')}>
      <ViewSwitch />
      <button
        className={sharedStyles.btn}
        type="button"
        aria-pressed={u.sky}
        title="淡出面板看完整星图；任务星查看详情，版本星跳到发布记录（快捷键 S）"
        onClick={() => setSky(true)}
      >
        ✦ 星图
      </button>
      <button
        className={sharedStyles.btn}
        type="button"
        aria-pressed={u.projection}
        title="放大字号、每段只留一行，适合会议室投屏"
        onClick={() => setProjection(!u.projection)}
      >
        大字
      </button>
      <button className={sharedStyles.btn} type="button" onClick={full.toggle}>
        {full.label}
      </button>
    </div>
  );
}
