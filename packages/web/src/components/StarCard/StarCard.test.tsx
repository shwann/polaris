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

it('shows a unique task id for repeated sky codes while retaining the board title', async () => {
  const { dataStore } = await import('../../store/dataStore');
  const snapshot = structuredClone(dataStore.getState().snapshot!);
  const task = snapshot.tasks.find((t) => t.id === 'EXPORT')!;
  task.code = 'DESK5';
  snapshot.tasks.push({ ...task, id: 'RISK-DRIFT' });
  dataStore.setState({ snapshot });
  uiStore.setState({ selected: 'EXPORT', sky: true });
  const { rerender } = render(<StarCard />);
  expect(screen.getByText('EXPORT')).toBeTruthy();
  uiStore.setState({ sky: false });
  rerender(<StarCard />);
  expect(screen.getByText('DESK5')).toBeTruthy();
});
