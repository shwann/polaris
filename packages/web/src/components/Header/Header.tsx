import styles from './Header.module.css';
import { cn } from '../../styles/cn';
import { Title } from './Title/Title';
import { Ticker } from './Ticker/Ticker';
import { Telemetry } from './Telemetry/Telemetry';
import { Clock } from './Clock/Clock';
import { WatchRows } from './WatchRows/WatchRows';
import { Figures } from '../Figures/Figures';
import { SectionHeading } from '../Shared/Shared';
import { SystemTabs } from '../SystemTabs/SystemTabs';
import { ViewButtons } from '../ViewButtons/ViewButtons';
import { useBoard } from '../../hooks/useBoard';
import { useLayout } from '../../hooks/useLayout';
import { systemLabel, latestUpdate } from '../../domain/selectors';
import { fmt } from '../../domain/time';
import { DispatchSummary } from './DispatchSummary/DispatchSummary';

import { vars } from '../../styles/style';
export function Header() {
  const { view, data, ui } = useBoard(),
    boot = data.booted ? undefined : 'boot',
    latest = latestUpdate(data.snapshot, view.tasks);
  return (
    <header className={styles.cover} ref={useLayout('cover')}>
      <div className={boot} style={vars({ '--d': 0 })} data-sky-block>
        <Title />
        <Telemetry />
        <Ticker />
        <DispatchSummary
          systems={view.systemKey === 'all' ? view.systems : [view.system]}
          all={view.systemKey === 'all'}
        />
        <p className={styles.sub}>
          {view.note || '由 Claude 维护：任务派出、完成、合入、发版、需要你决定时都会更新。'}
        </p>
      </div>
      <div className={cn(styles.side, boot)} style={vars({ '--d': 1 })} data-sky-block>
        <Clock />
        <WatchRows />
      </div>
      <div className={styles.tabbar} ref={useLayout('tabs')} data-sky-block>
        <SystemTabs />
        <ViewButtons className={styles.actions} />
      </div>
      {ui.view === 'tasks' && (
        <>
          <div className={styles['sec-h']} data-sky-block>
            <SectionHeading>{systemLabel(view)} · 任务概况</SectionHeading>
            <span className={styles.stamp} title={view.note}>
              {latest ? '最近更新 ' + fmt(latest, true) : data.snapshot ? '' : '读取中…'}
            </span>
          </div>
          <Figures />
        </>
      )}
    </header>
  );
}
