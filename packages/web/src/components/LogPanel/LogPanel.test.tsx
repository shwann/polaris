import '../../../tests/support';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LogPanel } from './LogPanel';
it('shows the latest event, today count and expandable clipped activity', async () => {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(20);
  const { container } = render(<LogPanel />);
  expect(container.querySelectorAll('.p-LogPanel-pulse i')).toHaveLength(24);
  expect(screen.getByText('LATEST')).toBeTruthy();
  await act(() => vi.advanceTimersByTimeAsync(16));
  fireEvent.click(screen.getByRole('button', { name: '展开 ▾' }));
  expect(screen.getByRole('button', { name: '收起 ▴' })).toBeTruthy();
});
