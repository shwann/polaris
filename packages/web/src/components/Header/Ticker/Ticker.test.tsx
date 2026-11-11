import '../../../../tests/support';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Ticker } from './Ticker';
it('shows the latest activity and scrolls to the log', () => {
  const node = document.createElement('aside');
  node.id = 'activity';
  node.scrollIntoView = vi.fn();
  document.body.append(node);
  render(<Ticker />);
  fireEvent.click(screen.getByRole('button', { name: /建好北辰看板/ }));
  expect(node.scrollIntoView).toHaveBeenCalledOnce();
  node.remove();
});
