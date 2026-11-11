import styles from './Figures.module.css';
import { figures } from '../../domain/presentation';
import { useBoard } from '../../hooks/useBoard';
import { useLayout } from '../../hooks/useLayout';
import { FigureCard } from './FigureCard/FigureCard';

export function Figures() {
  const { view, data } = useBoard();
  return (
    <div id="figures" className={styles.figures} ref={useLayout('figures')} data-sky-block>
      {figures(view).map((f, index) => (
        <FigureCard key={f.label} figure={f} index={index} booted={data.booted} model={view.app?.model} />
      ))}
    </div>
  );
}
