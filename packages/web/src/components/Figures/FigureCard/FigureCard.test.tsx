import '../../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Figures } from '../Figures';
import { uiStore } from '../../../store/uiStore';
it('lights a card and its Dipper star, toggles off, and supports keyboard activation', () => {
  render(<Figures />);
  const card = screen.getByRole('button', { name: /正式 App/ });
  fireEvent.click(card);
  expect(card.getAttribute('aria-pressed')).toBe('true');
  expect(uiStore.getState().pinned).toBe(0);
  fireEvent.click(card);
  expect(uiStore.getState().pinned).toBe(-1);
  fireEvent.keyDown(card, { key: 'Enter' });
  expect(uiStore.getState().pinned).toBe(0);
});
