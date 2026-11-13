import '../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StarCard, moveStarCard } from './StarCard';
import { uiStore } from '../../store/uiStore';
it('shows waiting age and needs, follows the selected star, and closes independently', () => {
  uiStore.setState({ selected: 'EXPORT', sky: true, dip: -1 });
  render(<StarCard />);
  expect(screen.getByText('已等 4 天')).toBeTruthy();
  expect(screen.getByText('选 Excel 还是 CSV')).toBeTruthy();
  moveStarCard(200, 100);
  expect(document.getElementById('starcard')?.style.transform).toContain('translate(');
  fireEvent.click(screen.getByRole('button', { name: '关闭' }));
  expect(uiStore.getState()).toMatchObject({ selected: null, dip: -1, sky: true });
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

it('shows the executor and task dispatch override in a read-only mirror', async () => {
  const { dataStore } = await import('../../store/dataStore');
  const snapshot = structuredClone(dataStore.getState().snapshot!);
  Object.assign(
    snapshot.tasks.find((t) => t.id === 'EXPORT')!,
    {
      executor: 'Codex gpt-6.1-sol xhigh｜商务 worktree｜会话',
      dispatchEngine: 'codex',
      dispatchModel: 'gpt-6.1-sol',
      dispatchEffort: 'high',
    },
  );
  dataStore.setState({ snapshot });
  uiStore.setState({ selected: 'EXPORT', sky: true });
  render(<StarCard />);
  expect(screen.getByText('执行：Codex gpt-6.1-sol xhigh｜商务 worktree｜会话')).toBeTruthy();
  expect(screen.getByText('派工覆盖：codex/gpt-6.1-sol/high')).toBeTruthy();
  expect(screen.queryByRole('textbox')).toBeNull();
});
