import '../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Digest } from './Digest';
import { uiStore } from '../../store/uiStore';
it('reports attention groups and opens the formal app panel from release rows', () => {
  render(<Digest />);
  expect(screen.getByText('等待中 · 1 项')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /下一版 1.3/ }));
  expect(uiStore.getState().dip).toBe(0);
});
