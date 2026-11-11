import styles from './DipperMark.module.css';
import { cn } from '../../../styles/cn';
import { DIPPER, DIPPER_LINES } from '../../../domain/lanes';

const point = (k: number) => [DIPPER[k]!.x * 34, DIPPER[k]!.y * 26];
export function DipperMark({ index }: { index: number }) {
  const d = DIPPER[index]!;
  return (
    <em>
      <svg data-dipper viewBox="-1 -1 36 15" className={styles.dip} aria-hidden="true">
        <path d={DIPPER_LINES.map(([a, b]) => `M${point(a)}L${point(b)}`).join('')} />
        {DIPPER.map((_, k) => {
          const [x, y] = point(k);
          return <circle key={k} cx={x} cy={y} r={k === index ? 1.9 : 1.1} className={cn(k === index && styles.me)} />;
        })}
      </svg>
      <b>
        <i data-greek>{d.gr} </i>
        {d.zh}
      </b>
    </em>
  );
}
