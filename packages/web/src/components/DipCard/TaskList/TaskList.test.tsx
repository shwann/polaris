import '../../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskList } from './TaskList';
import { sample } from '../../../../tests/fixtures/sample';
import { uiStore } from '../../../store/uiStore';
it('opens task detail from a shipped or candidate list', () => {
  render(<TaskList items={[sample.tasks[0]!]} />);
  fireEvent.click(screen.getByRole('button'));
  expect(uiStore.getState().selected).toBe(sample.tasks[0]!.id);
});
