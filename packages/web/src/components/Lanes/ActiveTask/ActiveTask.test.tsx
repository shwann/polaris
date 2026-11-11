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
