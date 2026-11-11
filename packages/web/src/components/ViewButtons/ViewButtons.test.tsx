import '../../../tests/support';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ViewButtons } from './ViewButtons';
import { uiStore } from '../../store/uiStore';
it('toggles projection and chart, persisting the existing projection key', () => {
  render(<ViewButtons />);
  fireEvent.click(screen.getByRole('button', { name: '大字' }));
  expect(localStorage.getItem('board-proj')).toBe('1');
  fireEvent.click(screen.getByRole('button', { name: '✦ 星图' }));
  expect(uiStore.getState().sky).toBe(true);
});
it('shows the original fullscreen-unavailable message when request fails', async () => {
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value: vi.fn().mockRejectedValue(new Error('unsupported')),
  });
  render(<ViewButtons />);
  await act(() => fireEvent.click(screen.getByRole('button', { name: '⛶ 投屏全屏' })));
  expect(screen.getByRole('button', { name: '此处不支持全屏' })).toBeTruthy();
});
