import '../../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskRow } from './TaskRow';
import { sample } from '../../../../tests/fixtures/sample';
import { uiStore } from '../../../store/uiStore';
it('opens and selects a task from its chart location action', () => {
  const t = sample.tasks.find((t) => t.id === 'EXPORT')!;
  render(<TaskRow task={t} changed={false} />);
  fireEvent.click(screen.getByRole('button', { name: /在星图中定位 EXPORT/ }));
  expect(uiStore.getState()).toMatchObject({ sky: true, selected: 'EXPORT' });
});
