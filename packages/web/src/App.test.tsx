import '../tests/support';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Dashboard } from './App';
import sharedStyles from './components/Shared/Shared.module.css';
import { dataStore } from './store/dataStore';
import { requirement } from '../tests/fixtures/requirements';
it('runs the sample dashboard with canvas and all panels, including layered Esc', async () => {
  const warn = vi.spyOn(console, 'warn');
  render(<Dashboard />);
  expect(screen.getAllByRole('tab')).toHaveLength(2);
  expect(screen.getByRole('searchbox')).toBeTruthy();
  fireEvent.click(screen.getByTitle('北辰 · 总览：各系统与七个模块'));
  expect(screen.getByRole('dialog', { name: '北斗分组' })).toBeTruthy();
  fireEvent.keyDown(window, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: /在星图中定位 EXPORT/ }));
  await act(() => vi.advanceTimersByTimeAsync(32));
  expect(screen.getByRole('dialog', { name: '任务详情' })).toBeTruthy();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: '任务详情' })).toBeNull();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(document.documentElement.classList.contains('sky')).toBe(false);
  expect(warn).not.toHaveBeenCalled();
});

it('keeps numbered section headings in page order across filtering and view switches', () => {
  const { container } = render(<Dashboard />);
  const headings = () =>
    Array.from(container.getElementsByClassName(sharedStyles['section-heading']!), (heading) => heading.textContent);
  expect(headings().slice(0, 4)).toEqual(['北斗 · 任务概况', '任务矩阵', '任务分组', '发版动态']);
  expect(headings().at(-1)).toContain('最近动态');
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nothing matches' } });
  act(() => vi.advanceTimersByTime(150));
  expect(headings()).toHaveLength(6);
  fireEvent.click(screen.getByRole('button', { name: '需求' }));
  expect(headings()).toEqual(['北斗 · 需求概况']);
  fireEvent.click(screen.getByRole('button', { name: '任务' }));
  expect(headings().slice(0, 4)).toEqual(['北斗 · 任务概况', '任务矩阵', '任务分组', '发版动态']);
});

it('keeps requirement body headings out of the section counter', () => {
  dataStore.setState({
    snapshot: { ...dataStore.getState().snapshot!, requirements: [requirement({ body: '## 需求正文标题' })] },
  });
  render(<Dashboard />);
  fireEvent.click(screen.getByRole('button', { name: '需求' }));
  expect(screen.getByText('需求正文标题').classList.contains(sharedStyles['section-heading']!)).toBe(false);
  expect(screen.getByText('北斗 · 需求概况').classList.contains(sharedStyles['section-heading']!)).toBe(true);
});
