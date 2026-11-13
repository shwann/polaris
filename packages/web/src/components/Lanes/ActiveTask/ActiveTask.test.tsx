import '../../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveTask } from './ActiveTask';
import { sample } from '../../../../tests/fixtures/sample';
import { uiStore } from '../../../store/uiStore';
it('keeps step labels and task progress and supports chart location', () => {
  render(<ActiveTask task={sample.tasks.find((t) => t.id === 'LOGIN')!} changed={false} />);
  expect(screen.getByText('RUNNING · 进行中')).toBeTruthy();
  expect(screen.getByText('QUEUED · 未开始')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /在星图中定位 LOGIN/ }));
  expect(uiStore.getState().selected).toBe('LOGIN');
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
