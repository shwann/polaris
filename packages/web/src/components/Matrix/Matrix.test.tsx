import '../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Matrix } from './Matrix';
import { uiStore } from '../../store/uiStore';
it('keeps one cell per task and opens Polaris from the completion ratio', () => {
  const { container } = render(<Matrix />);
  expect(container.querySelectorAll('.p-Matrix-cells i')).toHaveLength(7);
  fireEvent.click(screen.getByTitle('北辰 · 看总览'));
  expect(uiStore.getState().dip).toBe(7);
});
