import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Dashboard } from '../../App';
import { dataStore } from '../../store/dataStore';
import { setView, uiStore } from '../../store/uiStore';
import { requirement, requirementSnapshot } from '../../../tests/fixtures/requirements';
import { legacySample } from '../../../tests/fixtures/sample';
import { normalize } from '../../data/normalize';

function openRequirements() {
  dataStore.setState({ snapshot: requirementSnapshot });
  const result = render(<Dashboard />);
  fireEvent.click(screen.getByRole('button', { name: '需求' }));
  return result;
}
const pool = () => screen.getByRole('region', { name: '需求池' });
const row = (id: string) => within(pool()).getByText(id).closest('details')!;

it('switches only the body, syncs hash, and restores the view on remount and history changes', () => {
  const result = openRequirements();
  expect(location.hash).toBe('#reqs');
  expect(uiStore.getState().view).toBe('reqs');
  expect(screen.getByRole('group', { name: '看板视图' })).toBeTruthy();
  expect(screen.getByLabelText('关注')).toBeTruthy();
  expect(screen.getAllByRole('tab')).toHaveLength(2);
  expect(document.getElementById('figures')).toBeNull();
  expect(screen.queryByLabelText('搜索任务')).toBeNull();
  expect(document.getElementById('main')).toBeNull();
  result.unmount();
  uiStore.setState({ view: 'tasks' });
  render(<Dashboard />);
  expect(screen.getByRole('main', { name: '需求视图' })).toBeTruthy();
  expect(uiStore.getState().view).toBe('reqs');
  act(() => {
    window.history.replaceState(null, '', '/#tasks');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(screen.getByLabelText('搜索任务')).toBeTruthy();
  expect(document.getElementById('figures')).toBeTruthy();
  act(() => {
    window.history.replaceState(null, '', '/#reqs');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  expect(screen.getByLabelText('搜索需求')).toBeTruthy();
  act(() => {
    window.history.replaceState(null, '', '/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(screen.getByLabelText('搜索任务')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '需求' }));
  fireEvent.click(screen.getByRole('button', { name: '任务' }));
  expect(location.hash).toBe('#tasks');
});

it('restores a direct #reqs URL on first render', () => {
  window.history.replaceState(null, '', '/#reqs');
  render(<Dashboard />);
  expect(screen.getByRole('button', { name: '需求' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('还没有需求。对 Claude 说‘记一条需求’，或用 /polaris:req。')).toBeTruthy();
});

it('expands and collapses criteria, Markdown body, documents and task details', () => {
  openRequirements();
  const detail = row('R-001');
  expect(detail.open).toBe(false);
  fireEvent.click(detail.querySelector('summary')!);
  expect(detail.open).toBe(true);
  const body = within(detail).getByText('后台通知');
  expect(body.tagName).toBe('STRONG');
  expect(body.parentElement?.textContent).toBe('后台通知\n设置里可以关闭');
  expect(within(detail).getByText('后台时才发通知').textContent).toContain('✓');
  expect(within(detail).getByText('可以关闭通知').textContent).toContain('○');
  expect(within(detail).getByText('验收 1 / 2')).toBeTruthy();
  expect(within(detail).getByRole('link', { name: 'https://example.com/prd' }).getAttribute('href')).toBe(
    'https://example.com/prd',
  );
  expect(within(detail).getByText('docs/notifications.md')).toBeTruthy();
  expect(within(detail).getByText('NOTICE · 50%')).toBeTruthy();
  expect(within(detail).getByText('开发中 · 实现中 · 50%')).toBeTruthy();
  fireEvent.click(detail.querySelector('summary')!);
  expect(detail.open).toBe(false);
});

it('combines state, priority, search and gap filters and keeps task filters independent', () => {
  openRequirements();
  fireEvent.click(screen.getByRole('button', { name: /已排期\s*1/ }));
  expect(within(pool()).queryByText('R-001')).toBeNull();
  expect(within(pool()).getByText('R-002')).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox', { name: '需求优先级' }), { target: { value: 'P0' } });
  fireEvent.change(screen.getByRole('searchbox', { name: '搜索需求' }), { target: { value: 'r-002 导出 所有' } });
  fireEvent.click(screen.getByRole('button', { name: '只看漏项' }));
  expect(within(pool()).getByText('R-002')).toBeTruthy();
  expect(screen.getByText('1 / 3 条需求')).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
  expect(screen.getByText('没有符合条件的需求，请调整筛选。')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '重置筛选' }));
  expect(pool().querySelectorAll('details')).toHaveLength(3);
  expect(uiStore.getState().query).toBe('');
  expect(uiStore.getState().mineOnly).toBe(false);
});

it('shows only in-system requirements and gaps; all systems labels each row with its constellation', () => {
  dataStore.setState({
    snapshot: {
      ...requirementSnapshot,
      systems: [
        ...requirementSnapshot.systems,
        { ...requirementSnapshot.systems[0]!, key: 'other', name: '其他', constellation: '天琴' },
      ],
      requirements: [...requirementSnapshot.requirements, requirement({ id: 'R-OTHER', systemKey: 'other' })],
    },
  });
  render(<Dashboard />);
  fireEvent.click(screen.getByRole('button', { name: '需求' }));
  expect(within(pool()).queryByText('R-OTHER')).toBeNull();
  act(() => uiStore.setState({ system: 'all' }));
  expect(within(row('R-OTHER')).getByText('天琴')).toBeTruthy();
  expect(within(row('R-001')).getByText('北斗')).toBeTruthy();
  act(() => uiStore.setState({ system: 'other' }));
  expect(within(pool()).queryByText('R-001')).toBeNull();
  expect(pool().querySelectorAll('details')).toHaveLength(1);
});

it.each([
  normalize(legacySample),
  { ...requirementSnapshot, requirements: [] },
  { ...requirementSnapshot, requirements: undefined } as unknown as typeof requirementSnapshot,
])('shows the requested empty state for legacy and empty requirement data', (snapshot) => {
  dataStore.setState({ snapshot });
  window.history.replaceState(null, '', '/#reqs');
  render(<Dashboard />);
  expect(screen.getByText('还没有需求。对 Claude 说‘记一条需求’，或用 /polaris:req。')).toBeTruthy();
});

it('excludes release plans from gaps and jumps from an unlinked task back to its visible row', async () => {
  openRequirements();
  act(() => uiStore.setState({ query: 'no-match', mineOnly: true }));
  const gaps = screen.getByRole('region', { name: '漏项' });
  expect(within(gaps).getByText('R-002')).toBeTruthy();
  expect(within(gaps).queryByText('REL120', { exact: false })).toBeNull();
  expect(within(gaps).queryByText('NOTICE', { exact: false })).toBeNull();
  const scroll = vi.fn();
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  fireEvent.click(within(gaps).getByRole('button', { name: 'SETTINGS · 设置开关任务' }));
  await act(() => vi.advanceTimersByTimeAsync(400));
  expect(uiStore.getState().view).toBe('tasks');
  expect(location.hash).toBe('#tasks');
  expect(scroll).toHaveBeenCalled();
  const target = document.querySelector('#main [data-id="T-2"]')!;
  expect(target).toBeTruthy();
  expect(target.className).toContain('pinged');
  expect(uiStore.getState().sky).toBe(false);
  expect(uiStore.getState().query).toBe('');
});

it('keeps the focus-row action functional while in requirement view', async () => {
  openRequirements();
  fireEvent.click(screen.getByTitle('只看需要你处理的任务'));
  await act(() => vi.advanceTimersByTimeAsync(32));
  expect(uiStore.getState().view).toBe('tasks');
  expect(uiStore.getState().mineOnly).toBe(true);
  act(() => setView('reqs'));
  expect(screen.getByLabelText('搜索需求')).toBeTruthy();
});

it('folds a long list of untraced tasks and registers the overview as the header edge for the sky', () => {
  const many = Array.from({ length: 11 }, (_, i) => ({
    ...requirementSnapshot.tasks[0]!,
    id: `X-${i}`,
    code: `X${i}`,
    title: `未挂需求 ${i}`,
    lane: 'doing' as const,
    reqIds: [],
  }));
  dataStore.setState({ snapshot: { ...requirementSnapshot, tasks: [...requirementSnapshot.tasks, ...many] } });
  render(<Dashboard />);
  fireEvent.click(screen.getByRole('button', { name: '需求' }));
  const gaps = screen.getByRole('region', { name: '漏项' });
  const more = within(gaps).getByRole('button', { name: /还有 \d+ 项/ });
  const shown = within(gaps)
    .getAllByRole('button')
    .filter((b) => b !== more).length;
  expect(shown).toBe(8);
  fireEvent.click(more);
  expect(within(gaps).getByRole('button', { name: '收起 ▴' })).toBeTruthy();
  expect(screen.getByLabelText('需求状态概况').hasAttribute('data-sky-block')).toBe(true);
});
