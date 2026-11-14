import '../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { DipCard } from './DipCard';
import { uiStore, openDip } from '../../store/uiStore';
import { dataStore } from '../../store/dataStore';
import { StarCard } from '../StarCard/StarCard';
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
it('shows a group waiting age and replaces the group with a task', () => {
  uiStore.setState({ dip: 3 });
  render(<DipCard />);
  expect(screen.getByText('星图上连着这一组全部 1 颗星 · 点一项看详情')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /EXPORT\s*导出格式要你定/ }));
  expect(uiStore.getState()).toMatchObject({ selected: 'EXPORT', dip: -1 });
  act(() => openDip(1));
  expect(screen.getByText('待开工')).toBeTruthy();
});

it('lists every release newest first with summaries and opens the existing release card', () => {
  const snapshot = structuredClone(dataStore.getState().snapshot!);
  snapshot.systems[0]!.releases = [
    { version: '.32', releasedAt: '2026-11-09T21:20:00+08:00', note: '较早版本。后续说明。' },
    { version: '.33', releasedAt: '2026-11-10T21:20:00+08:00', title: '最新交付' },
  ];
  dataStore.setState({ snapshot });
  uiStore.setState({ sky: true, dip: 0 });
  render(
    <>
      <DipCard />
      <StarCard />
    </>,
  );
  const panel = screen.getByRole('dialog', { name: '北斗分组' });
  expect(within(panel).getByText('星图上连着全部 2 个版本 · 点一项看详情')).toBeTruthy();
  const releases = within(panel)
    .getAllByRole('button')
    .filter((button) => button.querySelector('[data-code]')?.textContent?.startsWith('.'));
  expect(releases.map((button) => button.querySelector('[data-code]')!.textContent)).toEqual(['.33', '.32']);
  expect(releases[0]!.textContent).toContain('最新交付');
  expect(releases[1]!.textContent).toContain('较早版本');
  fireEvent.click(releases[0]!);
  expect(screen.getByRole('dialog', { name: '版本详情' }).dataset.releaseVersion).toBe('.33');
  expect(uiStore.getState()).toMatchObject({ dip: -1, selectedRelease: '.33', sky: true, releaseFocus: null });
});
