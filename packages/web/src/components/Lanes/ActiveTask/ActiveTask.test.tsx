import '../../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ActiveTask } from './ActiveTask';
import { sample } from '../../../../tests/fixtures/sample';
import { uiStore } from '../../../store/uiStore';
it('keeps step labels and task progress and supports chart location', () => {
  const task = sample.tasks.find((t) => t.id === 'LOGIN')!;
  render(
    <ActiveTask
      task={{ ...task, progress: 60, steps: [...task.steps, { name: '等验收数据', state: 'blocked' }] }}
      changed={false}
    />,
  );
  const steps = screen.getByRole('list', { name: '执行步骤' });
  for (const label of ['已完成', '执行中', '未开始', '受阻'])
    expect(within(steps).getAllByText(label).length).toBeGreaterThan(0);
  expect(screen.getByTitle('任务进度').textContent).toBe('60%');
  fireEvent.click(screen.getByRole('button', { name: /在星图中定位 LOGIN/ }));
  expect(uiStore.getState().selected).toBe('LOGIN');
});

it('shows the recorded status when the task has no steps', () => {
  const task = sample.tasks.find((t) => t.id === 'LOGIN')!;
  render(<ActiveTask task={{ ...task, steps: [], status: '已核对本机运行' }} changed={false} />);
  expect(screen.getByText('未录入步骤')).toBeTruthy();
  expect(screen.getByText('已核对本机运行')).toBeTruthy();
  expect(screen.queryByRole('list', { name: '执行步骤' })).toBeNull();
});

it('shows the executor and dispatch override for an active task', () => {
  const task = {
    ...sample.tasks.find((t) => t.id === 'LOGIN')!,
    executor: 'Claude opus medium｜wt x｜会话 y',
    dispatchEngine: 'claude' as const,
    dispatchModel: 'opus',
    dispatchEffort: 'medium',
  };
  render(<ActiveTask task={task} changed={false} />);
  expect(screen.getByText('执行：Claude opus medium｜wt x｜会话 y')).toBeTruthy();
  expect(screen.getByText('派工覆盖：claude/opus/medium')).toBeTruthy();
});
