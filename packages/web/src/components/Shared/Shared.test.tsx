import '../../../tests/support';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RefLine, Clamp } from './Shared';
it('copies the real plan path and shows the existing feedback', async () => {
  const write = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
  render(<RefLine parts={['Claude', 'docs/plan.md']} reference="docs/plan.md" />);
  await act(() => fireEvent.click(screen.getByRole('button', { name: '复制路径' })));
  expect(write).toHaveBeenCalledWith('docs/plan.md');
  expect(screen.getByRole('button', { name: '已复制' })).toBeTruthy();
  await act(() => vi.advanceTimersByTimeAsync(1800));
  expect(screen.getByRole('button', { name: '复制路径' })).toBeTruthy();
});
it('only offers expand when prose is actually clipped and remembers the expanded paragraph', async () => {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(20);
  render(<Clamp id="clip-example" text="完整说明" className="detail" />);
  await act(() => vi.advanceTimersByTimeAsync(16));
  fireEvent.click(screen.getByRole('button', { name: '展开 ▾' }));
  expect(screen.getByRole('button', { name: '收起 ▴' })).toBeTruthy();
});
