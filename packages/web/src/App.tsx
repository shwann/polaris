import { WriteNotice } from './components/LocalEdit/WriteNotice';
import styles from './App.module.css';
import { useClock } from './hooks/useClock';
import { Header } from './components/Header/Header';
import { Matrix } from './components/Matrix/Matrix';
import { Digest } from './components/Digest/Digest';
import { FilterBar } from './components/FilterBar/FilterBar';
import { Lanes } from './components/Lanes/Lanes';
import { LogPanel } from './components/LogPanel/LogPanel';
import { SkyCanvas } from './components/SkyCanvas/SkyCanvas';
import { SkyBar } from './components/SkyBar/SkyBar';
import { StarCard } from './components/StarCard/StarCard';
import { DipCard } from './components/DipCard/DipCard';
import { useDataSource } from './hooks/useDataSource';
import { useKeyboard } from './hooks/useKeyboard';
import { useProjection } from './hooks/useProjection';
import { useWakeLock } from './hooks/useWakeLock';
import { useDashboardEffects } from './hooks/useDashboardEffects';
import { Requirements } from './components/Requirements/Requirements';
import { useViewHash } from './hooks/useViewHash';
import { useData, useUI } from './hooks/useBoard';

export function Dashboard() {
  useClock(600000);
  useViewHash();
  useKeyboard();
  useProjection();
  useWakeLock();
  useDashboardEffects();
  const data = useData(),
    ui = useUI();
  return (
    <>
      <SkyCanvas />
      <SkyBar />
      <StarCard />
      <DipCard />
      <WriteNotice />
      <div id="sr" className={styles.sr} aria-live="polite" />
      <div className={styles.wrap}>
        <Header />
        {ui.view === 'tasks' && (
          <>
            <Matrix />
            <Digest />
          </>
        )}
        <p className={styles.state} hidden={!data.message}>
          {data.message}
        </p>
        {ui.view === 'reqs' ? (
          <Requirements />
        ) : (
          <>
            <FilterBar key={data.snapshot ? 'loaded' : 'loading'} />
            <div className={styles.layout}>
              <Lanes />
              <LogPanel />
            </div>
          </>
        )}
      </div>
    </>
  );
}
export function App() {
  useDataSource();
  return <Dashboard />;
}
