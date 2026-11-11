import '../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StarCard, moveStarCard } from './StarCard';
import { uiStore } from '../../store/uiStore';
it('shows waiting age and needs, follows the selected star, and closes independently', () => {
  uiStore.setState({ selected: 'EXPORT', sky: true, dip: 3 });
  render(<StarCard />);
  expect(screen.getByText('已等 4 天')).toBeTruthy();
  expect(screen.getByText('选 Excel 还是 CSV')).toBeTruthy();
  moveStarCard(200, 100);
  expect(document.getElementById('starcard')?.style.transform).toContain('translate(');
  fireEvent.click(screen.getByRole('button', { name: '关闭' }));
  expect(uiStore.getState()).toMatchObject({ selected: null, dip: 3, sky: true });
});
