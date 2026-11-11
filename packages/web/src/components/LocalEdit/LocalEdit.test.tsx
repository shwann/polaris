import '../../../tests/support';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TaskEditor } from './TaskEditor';
import { WriteNotice } from './WriteNotice';
import { RequirementRow } from '../Requirements/RequirementRow';
import { dataStore } from '../../store/dataStore';
import { sample } from '../../../tests/fixtures/sample';
import { requirement } from '../../../tests/fixtures/requirements';
import { localCredentials } from '../../data/localWrite';

const task = { ...sample.tasks[0]!, progress: 25 };
const credentials = { token: 'token', page: 'page' };
function enable() {
  dataStore.setState({ origin: 'local', credentials, snapshot: { ...sample, tasks: [task] } });
}
function controls() {
  return render(
    <>
      <TaskEditor task={dataStore.getState().snapshot?.tasks[0] ?? task} />
      <WriteNotice />
    </>,
  );
}

it('only enables credentials for loopback local sources with both injected meta values', () => {
  const page = document.implementation.createHTMLDocument();
  page.head.innerHTML = '<meta name="polaris-token" content="token"><meta name="polaris-page" content="page">';
  for (const origin of ['mirror', 'db'] as const)
    expect(localCredentials(origin, page, new URL('http://127.0.0.1:8790'))).toBeNull();
  expect(localCredentials('local', page, new URL('https://evil.test'))).toBeNull();
  expect(localCredentials('local', page, new URL('http://127.0.0.1:8790'))).toEqual(credentials);
  page.head.innerHTML = '';
  expect(localCredentials('local', page, new URL('http://localhost:8790'))).toBeNull();
});
it.each(['mirror', 'db', 'local'] as const)('hides editing for %s without usable credentials', (origin) => {
  dataStore.setState({ origin, credentials: origin === 'local' ? null : credentials });
  render(
    <>
      <TaskEditor task={task} />
      <RequirementRow requirement={requirement()} tasks={[]} />
    </>,
  );
  expect(screen.queryByLabelText(`${task.code} 分组`)).toBeNull();
  expect(screen.queryByLabelText('R-001 状态')).toBeNull();
  expect(screen.queryByRole('button', { name: /验收标准/ })).toBeNull();
});
it('shows six lane choices and task progress, disables during submission and refreshes snapshot with undo notice', async () => {
  enable();
  let resolve!: (response: Response) => void;
  const fetcher = vi.fn().mockReturnValue(
    new Promise<Response>((done) => {
      resolve = done;
    }),
  );
  vi.stubGlobal('fetch', fetcher);
  controls();
  const lane = screen.getByLabelText(`${task.code} 分组`) as HTMLSelectElement;
  expect(lane.options.length).toBe(6);
  fireEvent.change(lane, { target: { value: 'waiting' } });
  expect(lane.disabled).toBe(true);
  expect((screen.getByLabelText(`${task.code} 进度`) as HTMLInputElement).disabled).toBe(true);
  const updated = { ...sample, tasks: [{ ...task, lane: 'waiting' }] };
  await act(async () => {
    resolve(new Response(JSON.stringify({ ok: true, batch: 'B1', snapshot: updated })));
  });
  expect(dataStore.getState().snapshot?.tasks[0]?.lane).toBe('waiting');
  expect(screen.getByRole('status').textContent).toContain('已修改：');
  expect(screen.getByRole('button', { name: '撤销' })).toBeTruthy();
  expect(fetcher.mock.calls[0]).toEqual([
    '/api/task/move',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'X-Polaris-Token': 'token', 'X-Polaris-Page': 'page' }),
    }),
  ]);
  fetcher.mockResolvedValue(
    new Response(JSON.stringify({ ok: true, batch: 'B2', snapshot: { ...sample, tasks: [task] } })),
  );
  fireEvent.click(screen.getByRole('button', { name: '撤销' }));
  await act(async () => {});
  expect(fetcher.mock.calls[1]?.[0]).toBe('/api/undo');
  expect(JSON.parse(fetcher.mock.calls[1]?.[1].body)).toEqual({ batch: 'B1' });
  expect(dataStore.getState().snapshot?.tasks[0]?.lane).toBe(task.lane);
  expect(screen.getByRole('status').textContent).toContain('已撤销：');
  await act(() => vi.advanceTimersByTimeAsync(8000));
  expect(screen.queryByRole('status')).toBeNull();
});
it('submits progress on blur or Enter and resets failed input while preserving the old snapshot', async () => {
  enable();
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ ok: false, error: '字段已变化，无法修改' }), { status: 400 }));
  vi.stubGlobal('fetch', fetcher);
  controls();
  const before = dataStore.getState().snapshot;
  let input = screen.getByLabelText(`${task.code} 进度`) as HTMLInputElement;
  fireEvent.change(input, { target: { value: '60' } });
  fireEvent.blur(input);
  await act(async () => {});
  expect(screen.getByRole('alert').textContent).toBe('字段已变化，无法修改');
  expect(dataStore.getState().snapshot).toBe(before);
  input = screen.getByLabelText(`${task.code} 进度`) as HTMLInputElement;
  expect(input.value).toBe('25');
  fetcher.mockResolvedValue(
    new Response(
      JSON.stringify({ ok: true, batch: 'B3', snapshot: { ...sample, tasks: [{ ...task, progress: 70 }] } }),
    ),
  );
  input.focus();
  fireEvent.change(input, { target: { value: '70' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await act(async () => {});
  expect(dataStore.getState().snapshot?.tasks[0]?.progress).toBe(70);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it('shows eight requirement states and clickable criteria with one-based item numbers', async () => {
  enable();
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, batch: 'B', snapshot: sample })));
  vi.stubGlobal('fetch', fetcher);
  const r = requirement();
  render(<RequirementRow requirement={r} tasks={[]} />);
  fireEvent.click(screen.getByText(r.id).closest('details')!.querySelector('summary')!);
  expect((screen.getByLabelText(`${r.id} 状态`) as HTMLSelectElement).options.length).toBe(8);
  fireEvent.change(screen.getByLabelText(`${r.id} 状态`), { target: { value: 'confirmed' } });
  await act(async () => {});
  expect(JSON.parse(fetcher.mock.calls[0]?.[1].body)).toEqual({ id: r.id, status: 'confirmed' });
  fetcher.mockResolvedValue(new Response(JSON.stringify({ ok: true, batch: 'C', snapshot: sample })));
  fireEvent.click(screen.getByRole('button', { name: `${r.id} 验收标准 1` }));
  await act(async () => {});
  expect(JSON.parse(fetcher.mock.calls[1]?.[1].body)).toEqual({ id: r.id, item: 1, met: !r.acceptance[0]?.met });
});
