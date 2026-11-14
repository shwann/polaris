import styles from './FigureCard.module.css';
import { cn } from '../../../styles/cn';
import { segments } from '../../../domain/viewModels';
import type { Figure } from '../../../domain/types';
import { DIPPER } from '../../../domain/lanes';
import { useUI } from '../../../hooks/useBoard';
import { uiStore } from '../../../store/uiStore';
import { DipperMark } from '../DipperMark/DipperMark';
import { Count } from '../../Shared/Shared';
import { goLane, goRelease } from '../../../hooks/skyBridge';
import { FIG_LANE } from '../../../domain/lanes';

import { vars } from '../../../styles/style';
export function FigureCard({
  figure: f,
  index,
  booted,
  model,
}: {
  figure: Figure;
  index: number;
  booted: boolean;
  model?: string;
}) {
  const u = useUI(),
    d = DIPPER[index]!,
    title = `北斗${'一二三四五六七'[index]} · ${d.zh}（${d.en}） · 单击点亮北斗里的这颗星，双击跳到对应模块`,
    toggle = () => uiStore.setState({ pinned: u.pinned === index ? -1 : index });
  return (
    <div
      className={cn(styles.fig, 'hud', !booted && 'boot', u.pinned === index && styles.pinned)}
      style={vars({ '--c': `var(${f.color})`, '--d': index + 2 })}
      data-tone={f.vivid ? 'vivid' : 'quiet'}
      title={title}
      tabIndex={0}
      role="button"
      aria-pressed={u.pinned === index}
      onPointerEnter={() => uiStore.setState({ hovered: index })}
      onPointerLeave={() => uiStore.setState({ hovered: -1 })}
      onClick={toggle}
      onDoubleClick={() => {
        // Double-click jumps to the detail section: release history for the app card, the lane for the rest.
        uiStore.setState({ pinned: index });
        const lane = FIG_LANE[index];
        if (lane) goLane(lane);
        else goRelease();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <div className={styles.lab}>
        <span className={styles.name}>{f.label}</span>
        <DipperMark index={index} />
      </div>
      <b>{typeof f.value === 'number' ? <Count id={f.label} value={f.value} /> : f.value}</b>
      {!!f.notes.length && (
        <small title={f.notes.join(' · ') + (index === 0 && model ? `（模型 ${model}）` : '')}>
          {f.notes.map((text, k) => (
            <span key={text}>
              {k > 0 && <span className={styles.dot}> · </span>}
              <span className={styles.sg}>{text}</span>
            </span>
          ))}
        </small>
      )}
      <div className={styles.seg}>
        {segments(f.fraction).map((on, k) => (
          <i key={k} className={cn(on && styles.on)} />
        ))}
      </div>
    </div>
  );
}
