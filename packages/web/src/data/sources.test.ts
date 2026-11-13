import { afterEach, describe, expect, it, vi } from 'vitest';
import { legacySample, sample } from '../../tests/fixtures/sample';
import { normalize } from './normalize';
import { openSource } from './openSource';
import { localSource } from './localSource';
import { artifactSource } from './artifactSource';
import type { ArtifactDatabase, ArtifactSnapshot } from './DataSource';
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});
const response = () => Promise.resolve(new Response(JSON.stringify(legacySample)));
describe('source selection and normalization', () => {
  it('prefers the slot over legacy mirror and Artifact; legacy mirror over Artifact', async () => {
    const use = vi.fn();
    expect(
      (await openSource({ POLARIS_DATA: legacySample, claude: { use } }, JSON.stringify(sample)))?.label,
    ).toContain('11-11');
    expect((await openSource({ POLARIS_DATA: legacySample, claude: { use } }, ''))?.kind).toBe('mirror');
    expect(use).not.toHaveBeenCalled();
  });
  it('chooses local without Claude and Artifact only inside Claude, with offline null', async () => {
    expect((await openSource({}, ''))?.kind).toBe('local');
    const use = vi.fn().mockResolvedValue({});
    expect((await openSource({ claude: { use } }, ''))?.kind).toBe('db');
    expect(use).toHaveBeenCalledWith('db');
    expect(await openSource({ claude: { use: vi.fn().mockResolvedValue(null) } }, '')).toBeNull();
  });
  it('passes schema 1 through and converts legacy format through core', () => {
    expect(normalize(sample)).toBe(sample);
    expect(normalize(legacySample).tasks).toEqual(sample.tasks);
    expect(normalize(legacySample).presentation?.note).toBe(legacySample.board.note);
  });
  it('subscribes to an inline snapshot once and cancels cleanly', async () => {
    const source = (await openSource({}, JSON.stringify(sample)))!,
      emit = vi.fn();
    const off = source.subscribe(emit, vi.fn());
    await Promise.resolve();
    expect(emit).toHaveBeenCalledOnce();
    off();
  });
});
describe('local polling', () => {
  it('deduplicates unchanged content, reports failures, resends same content after recovery and disposes', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockImplementation(response),
      emit = vi.fn(),
      fail = vi.fn();
    const off = localSource(fetcher).subscribe(emit, fail);
    await vi.advanceTimersByTimeAsync(0);
    expect(emit).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(3000);
    expect(emit).toHaveBeenCalledOnce();
    fetcher.mockRejectedValueOnce(new Error('offline'));
    await vi.advanceTimersByTimeAsync(3000);
    expect(fail).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(3000);
    expect(emit).toHaveBeenCalledTimes(2);
    off();
    await vi.advanceTimersByTimeAsync(6000);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it('pauses while the tab is hidden, then resumes', async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    const fetcher = vi.fn().mockImplementation(response),
      off = localSource(fetcher).subscribe(vi.fn(), vi.fn());
    await vi.advanceTimersByTimeAsync(6000);
    expect(fetcher).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await vi.advanceTimersByTimeAsync(3000);
    expect(fetcher).toHaveBeenCalledOnce();
    off();
  });
  it('reports bad HTTP and bad JSON without replacing the last snapshot', async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('{'))
      .mockImplementation(response);
    const emit = vi.fn(),
      fail = vi.fn(),
      off = localSource(fetcher).subscribe(emit, fail);
    await vi.advanceTimersByTimeAsync(3000);
    expect(fail).toHaveBeenCalledTimes(2);
    expect(emit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);
    expect(emit).toHaveBeenCalledOnce();
    off();
  });
});
it('aggregates Artifact tasks and metadata, preserves cache confirmation and unsubscribes', () => {
  const callbacks = new Map<string, (s: ArtifactSnapshot) => void>(),
    dispose = vi.fn();
  const ref = (p: string) => ({
    onSnapshot: (cb: (s: ArtifactSnapshot) => void) => {
      callbacks.set(p, cb);
      return dispose;
    },
  });
  const db: ArtifactDatabase = { collection: ref, doc: ref },
    emit = vi.fn(),
    off = artifactSource(db).subscribe(emit, vi.fn());
  callbacks.get('tasks')!({
    data: () => ({}),
    docs: legacySample.tasks.map((t) => ({ id: t.id, data: () => t })),
    metadata: { fromCache: true },
  });
  callbacks.get('meta/board')!({ data: () => legacySample.board, exists: true });
  callbacks.get('meta/log')!({ data: () => legacySample.log, exists: true });
  expect(emit.mock.calls[0]![0].confirmed).toBe(false);
  callbacks.get('tasks')!({ data: () => ({}), docs: legacySample.tasks.map((t) => ({ id: t.id, data: () => t })) });
  expect(emit.mock.lastCall![0].confirmed).toBe(true);
  off();
  expect(dispose).toHaveBeenCalledTimes(3);
});

it('preserves dispatch settings, history and task execution fields in the shared local/mirror snapshot', async () => {
  const snapshot = structuredClone(sample);
  const current = {
    system: 'main',
    engine: 'codex' as const,
    model: 'gpt-6.1-sol',
    effort: 'xhigh',
    note: '原话',
    by: '用户',
    actor: 'test',
    setAt: '2026-11-13T00:00:00Z',
    source: 'system' as const,
  };
  snapshot.systems[0]!.dispatch = { current, history: [current] };
  Object.assign(snapshot.tasks[0]!, {
    dispatchEngine: 'claude',
    dispatchModel: 'opus',
    dispatchEffort: 'medium',
    executor: 'Claude｜会话',
  });
  expect(normalize(snapshot)).toBe(snapshot);
  const source = (await openSource({}, JSON.stringify(snapshot)))!,
    emit = vi.fn();
  const off = source.subscribe(emit, vi.fn());
  await Promise.resolve();
  expect(emit.mock.calls[0]![0].snapshot).toEqual(snapshot);
  off();
});
