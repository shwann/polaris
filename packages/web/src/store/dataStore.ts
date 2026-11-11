import { localWrite, type LocalCredentials, type WritePath } from '../data/localWrite';
import { createStore } from 'zustand/vanilla';
import type { DisplaySnapshot } from '../domain/types';
import type { Origin } from '../data/DataSource';
export interface DataState {
  snapshot: DisplaySnapshot | null;
  credentials: LocalCredentials | null;
  writing: boolean;
  writeRevision: number;
  notice: { text: string; batch?: string; error?: boolean } | null;
  origin: Origin | null;
  label: string;
  connected: boolean;
  message: string;
  booted: boolean;
  changed: Set<string>;
  logRevision: number;
}
export const dataStore = createStore<DataState>(() => ({
  snapshot: null,
  credentials: null,
  writing: false,
  writeRevision: 0,
  notice: null,
  origin: null,
  label: 'CONNECTING',
  connected: false,
  message: '',
  booted: false,
  changed: new Set(),
  logRevision: 0,
}));
export function acceptSnapshot(snapshot: DisplaySnapshot, confirmed: boolean) {
  const previous = dataStore.getState();
  const old = new Map(previous.snapshot?.tasks.map((t) => [t.id, JSON.stringify(t)]));
  const changed = new Set(
    previous.snapshot ? snapshot.tasks.filter((t) => old.get(t.id) !== JSON.stringify(t)).map((t) => t.id) : [],
  );
  const top = (s: DisplaySnapshot | null) => s?.events[0]?.at + '|' + s?.events[0]?.text;
  dataStore.setState({
    snapshot,
    changed,
    connected: confirmed,
    ...(confirmed ? { message: '' } : {}),
    logRevision: previous.logRevision + (previous.booted && top(previous.snapshot) !== top(snapshot) ? 1 : 0),
  });
}

export async function submitWrite(path: WritePath, body: Record<string, unknown>, description: string) {
  const state = dataStore.getState();
  if (!state.credentials || state.origin !== 'local' || state.writing) return;
  dataStore.setState({ writing: true, notice: null });
  try {
    const result = await localWrite(state.credentials, path, body);
    acceptSnapshot(result.snapshot, true);
    dataStore.setState({
      notice: {
        text: `${path === '/api/undo' ? '已撤销：' : '已修改：'}${description}${result.warning ? `。${result.warning}` : ''}`,
        ...(path === '/api/undo' ? {} : { batch: result.batch }),
      },
    });
  } catch (error) {
    dataStore.setState({ notice: { text: (error as Error).message, error: true } });
  } finally {
    dataStore.setState({ writing: false, writeRevision: dataStore.getState().writeRevision + 1 });
  }
}
