import '../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { DipCard } from './DipCard';
import { uiStore, openDip } from '../../store/uiStore';
it('shows formal app layers, shipped work, unverified work, next candidates and release history', () => {
  uiStore.setState({ dip: 0 });
  render(<DipCard />);
  const p = screen.getByRole('dialog', { name: '北斗分组' });
  expect(within(p).getByText('现在跑的是什么')).toBeTruthy();
  expect(within(p).getByText('这一版带了什么 · 2 项')).toBeTruthy();
  expect(within(p).getByText('上线后待实证 · 1 项')).toBeTruthy();
  expect(within(p).getByText('下一版 1.3 候选 · 1 项')).toBeTruthy();
  expect(within(p).getByText(/发版轨迹 · 2 版/)).toBeTruthy();
  fireEvent.click(within(p).getByRole('button', { name: '关闭' }));
  expect(uiStore.getState().dip).toBe(-1);
});
it('shows Polaris global totals and switches into any of the seven modules', () => {
  uiStore.setState({ dip: 7 });
  render(<DipCard />);
  expect(screen.getByText('1 个系统共 7 项 · 已完成 29% · 今日动态 1 条')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /α\s*天枢\s*正式 App/ }));
  expect(uiStore.getState().dip).toBe(0);
});
it('shows a group waiting age and opens a task without closing the group', () => {
  uiStore.setState({ dip: 3 });
  render(<DipCard />);
  expect(screen.getByText('星图上连着这一组全部 1 颗星 · 点一项看详情')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /EXPORT\s*导出格式要你定/ }));
  expect(uiStore.getState()).toMatchObject({ selected: 'EXPORT', dip: 3 });
  act(() => openDip(1));
  expect(screen.getByText('待开工')).toBeTruthy();
});
