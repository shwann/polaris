import styles from './Lanes.module.css';
import { useBoard } from '../../hooks/useBoard';
import { laneModel } from '../../domain/laneModel';
import { LaneSection } from './LaneSection/LaneSection';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/** Matches the two-column breakpoint in Lanes.module.css. */
const WIDE = '(min-width: 1280px)';
export function Lanes() {
  const { view, ui, data } = useBoard(),
    wide = useMediaQuery(WIDE),
    m = laneModel(view.tasks, ui, undefined, wide);
  if (!m.total)
    return (
      <div className={styles.main} id="main">
        <p className={styles.empty}>
          {data.snapshot
            ? '还没有任务记录。Claude 写入后会自动出现。'
            : '进度数据加载后，这里按“开发中、等你回复、等发版”等分组列出每项任务。'}
        </p>
      </div>
    );
  const section = (model: (typeof m.active)[number], two = false) => (
    <LaneSection key={model.lane.key} model={model} changed={data.changed} booted={data.booted} two={two} />
  );
  return (
    <div className={styles.main} id="main">
      {!m.shown ? (
        <p className={styles.empty}>没有符合条件的任务，换个关键词或关掉“只看需要我的”。</p>
      ) : (
        <>
          {m.active.map((x) => section(x))}
          {m.full.map((x) => section(x, true))}
          {(m.cols[0].length > 0 || m.cols[1].length > 0) && (
            <div className={styles.lanes}>
              {m.cols.map((col, i) => (
                <div key={i}>{col.map((x) => section(x))}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
