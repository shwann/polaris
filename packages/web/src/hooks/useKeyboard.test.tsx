import '../../tests/support';
import { it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useKeyboard } from './useKeyboard';
import { uiStore } from '../store/uiStore';
function Keys() {
  useKeyboard();
  return <input aria-label="输入" />;
}
it('closes task, group and sky one layer at a time; clears pinned star on the board', () => {
  uiStore.setState({ sky: true, dip: 3, selected: 'EXPORT', pinned: 2 });
  const { container } = render(<Keys />);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(uiStore.getState()).toMatchObject({ selected: null, dip: 3, sky: true });
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(uiStore.getState()).toMatchObject({ dip: -1, sky: true });
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(uiStore.getState().sky).toBe(false);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(uiStore.getState().pinned).toBe(-1);
  fireEvent.keyDown(container.querySelector('input')!, { key: 's' });
  expect(uiStore.getState().sky).toBe(false);
  fireEvent.keyDown(window, { key: 'S' });
  expect(uiStore.getState().sky).toBe(true);
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(uiStore.getState().selected).toBe('REPORT');
});
