import '../../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PolePanel } from './PolePanel';
import { uiStore } from '../../../store/uiStore';
it('offers seven module actions under the global system summary', () => {
  render(<PolePanel />);
  expect(screen.getByText('1 个系统共 7 项 · 已完成 29% · 今日动态 1 条')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /δ\s*天权/ }));
  expect(uiStore.getState().dip).toBe(3);
});
