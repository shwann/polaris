import '../../../../tests/support';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Lanes } from '../Lanes';
import { TaskRow } from '../TaskRow/TaskRow';
import { TaskEditor } from '../../LocalEdit/TaskEditor';
import { dataStore } from '../../../store/dataStore';
import { sample } from '../../../../tests/fixtures/sample';
import type { Task } from '../../../domain/types';

const base = sample.tasks.find((t) => t.id === 'EXPORT')!;
const make = (id: string, patch: Partial<Task>): Task => ({ ...base, id, code: id, ...patch });

it('shows 等你, 等客户 and 等前置 sections in order with counts and hides empty ones', () => {
  dataStore.setState({
    snapshot: {
      ...sample,
      tasks: [
        ...sample.tasks.filter((t) => t.lane !== 'waiting'),
        make('P1', { waitingOn: 'dependency', needs: '等 ACC1 合入', detail: '前置任务说明' }),
        make('U1', {}),
        make('P2', { waitingOn: 'dependency' }),
      ],
    },
  });
  render(<Lanes />);
  const heading = screen.getByText('等待中', { selector: '.p-LaneSection-name' });
  const section = heading.closest('section')!;
  const parts = [...section.querySelectorAll('[data-wait-section]')];
  expect(parts.map((p) => p.getAttribute('data-wait'))).toEqual(['user', 'dependency']);
  expect(parts.map((p) => p.querySelector('h3')!.textContent)).toEqual(['等你1', '等前置2']);
  const compact = within(parts[1] as HTMLElement);
  expect(compact.getAllByText('等前置：')).toHaveLength(2);
  expect(compact.queryByText('前置任务说明')).toBeNull();
  expect(within(parts[0] as HTMLElement).getByText('需要你：')).toBeTruthy();
});

it('labels the ask line by who the task waits on', () => {
  render(<TaskRow task={make('C1', { waitingOn: 'customer', needs: '客户给图纸' })} changed={false} />);
  expect(screen.getByText('等客户：')).toBeTruthy();
  expect(screen.queryByText('需要你：')).toBeNull();
});

it('edits 等谁 through /api/task/move without changing the lane', async () => {
  const task = make('U1', {});
  dataStore.setState({
    origin: 'local',
    credentials: { token: 't', page: 'p' },
    snapshot: { ...sample, tasks: [task] },
  });
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, batch: 'B1', snapshot: { ...sample, tasks: [{ ...task, waitingOn: 'customer' }] } }),
      ),
    );
  vi.stubGlobal('fetch', fetcher);
  render(<TaskEditor task={task} />);
  const select = screen.getByLabelText('U1 等谁') as HTMLSelectElement;
  expect([...select.options].map((o) => o.textContent)).toEqual(['等你', '等客户', '等前置']);
  expect(select.value).toBe('user');
  fireEvent.change(select, { target: { value: 'customer' } });
  await act(async () => {});
  expect(fetcher.mock.calls[0]![0]).toBe('/api/task/move');
  expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({ id: 'U1', lane: 'waiting', waitingOn: 'customer' });
  expect(dataStore.getState().snapshot?.tasks[0]?.waitingOn).toBe('customer');
});

it('offers no 等谁 choice on a task that is neither waiting nor asking', () => {
  const task = make('D1', { lane: 'doing', needs: undefined });
  dataStore.setState({
    origin: 'local',
    credentials: { token: 't', page: 'p' },
    snapshot: { ...sample, tasks: [task] },
  });
  render(<TaskEditor task={task} />);
  expect(screen.queryByLabelText('D1 等谁')).toBeNull();
});
