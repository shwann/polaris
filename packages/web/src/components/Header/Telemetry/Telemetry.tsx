import styles from './Telemetry.module.css';
import { useBoard } from '../../../hooks/useBoard';

export function Telemetry() {
  const { data, view } = useBoard(),
    uplink =
      data.origin === 'local' && data.credentials ? window.location.port || 'LOCAL' : data.origin ? 'MIRROR' : '—';
  return (
    <div className={styles.telemetry} aria-label="系统遥测">
      SYS <b>{data.connected ? 'ONLINE' : 'OFFLINE'}</b>
      {' · UPLINK '}
      <i>{data.connected ? '●' : '○'}</i> <b>{uplink}</b>
      {' · RA '}
      <b>02h31m</b> DEC <b>+89°15′</b>
      {' · NODES '}
      <b>{data.snapshot?.tasks.length ?? '—'}</b>
      {' · BUILD '}
      <b>{view.appVersion}</b>
    </div>
  );
}
