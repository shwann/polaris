import '../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkyBar } from './SkyBar';
import { uiStore } from '../../store/uiStore';
it('switches input hints and saves the original mouse/trackpad key', () => {
  uiStore.setState({ sky: true, query: 'EXPORT' });
  render(<SkyBar />);
  fireEvent.click(screen.getByRole('button', { name: '触控板' }));
  expect(localStorage.getItem('board-input')).toBe('pad');
  expect(screen.getByText('双指滑动平移 · 双指捏合缩放 · 点星或按 ← → 看详情')).toBeTruthy();
  expect(screen.getByText('按看板筛选 · 亮 1 / 7')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '返回看板 · Esc' }));
  expect(uiStore.getState().sky).toBe(false);
});
