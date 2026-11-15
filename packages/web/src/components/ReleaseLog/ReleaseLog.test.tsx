import '../../../tests/support';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ReleaseLog } from './ReleaseLog';
import { Digest } from '../Digest/Digest';
import { Figures } from '../Figures/Figures';
import { dataStore } from '../../store/dataStore';
import { uiStore } from '../../store/uiStore';
import { goRelease } from '../../hooks/skyBridge';

function setup() {
  const data = structuredClone(dataStore.getState().snapshot!);
  data.systems[0]!.releases = Array.from({ length: 9 }, (_, i) => ({
    version: `.${31 + i}`,
    releasedAt: new Date(Date.UTC(2026, 10, i + 1)).toISOString(),
    ...(i === 8 ? { title: '功能上线', tag: 'feature' as const, build: 'B39', ref: 'docs/release-39.md' } : {}),
    ...(i === 7 ? { note: '先修复读取。后续说明不作简介。' } : {}),
  })).reverse();
  data.tasks = Array.from({ length: 10 }, (_, i) => ({
    ...data.tasks[0]!,
    id: `delivery${i}`,
    code: i ? `FEAT-${i}` : 'FIX-0',
    title: `交付项目 ${i}`,
    shippedIn: '.39',
    systemKey: data.systems[0]!.key,
  }));
  dataStore.setState({ snapshot: data, origin: 'mirror', credentials: null });
}

it('sorts newest first, marks only the latest online, caps items at eight, falls back through note and empty prose, and expands all', () => {
  setup();
  render(<ReleaseLog />);
  const cards = screen.getAllByRole('article');
  expect(cards).toHaveLength(2);
  expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual(['发布 .39', '发布 .38']);
  expect(within(cards[0]!).getByText('当前线上')).toBeTruthy();
  expect(screen.getAllByText('当前线上')).toHaveLength(1);
  expect(within(cards[0]!).getByText('功能上线')).toBeTruthy();
  expect(within(cards[0]!).getAllByRole('listitem')).toHaveLength(9);
  expect(within(cards[0]!).getByText('+2')).toBeTruthy();
  expect(screen.queryByText('交付项目 8')).toBeNull();
  expect(screen.getByText('先修复读取')).toBeTruthy();
  expect(screen.queryByText('（未填写简介）')).toBeNull();
  expect(within(cards[0]!).getByText('B39')).toBeTruthy();
  expect(within(cards[0]!).getByText('docs/release-39.md')).toBeTruthy();
  expect(cards[0]!.getAttribute('style')).not.toBe(cards[1]!.getAttribute('style'));
  fireEvent.click(screen.getByRole('button', { name: '展开全部 9 版' }));
  expect(screen.getAllByRole('article')).toHaveLength(9);
  expect(screen.getAllByText('（未填写简介）')).toHaveLength(7);
  fireEvent.click(screen.getByRole('button', { name: '收起' }));
  expect(screen.getAllByRole('article')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: /编辑/ })).toBeNull();
});

it('routes the formal app digest and double-clicked figure to release history', () => {
  setup();
  render(
    <>
      <Figures />
      <Digest />
      <ReleaseLog />
    </>,
  );
  const panel = document.getElementById('release-log')!;
  panel.scrollIntoView = vi.fn();
  fireEvent.click(within(screen.getByRole('region', { name: '发版动态' })).getByRole('button', { name: /^正式 App/ }));
  act(() => vi.advanceTimersByTime(300));
  expect(panel.scrollIntoView).toHaveBeenCalledOnce();
  fireEvent.doubleClick(screen.getAllByRole('button', { name: /正式 App/ })[0]!);
  act(() => vi.advanceTimersByTime(300));
  expect(panel.scrollIntoView).toHaveBeenCalledTimes(2);
});

it('exits sky/requirements view, expands an older release and highlights its card', () => {
  setup();
  render(<ReleaseLog />);
  act(() => {
    uiStore.setState({ sky: true, view: 'reqs' });
    goRelease('.37');
    vi.advanceTimersByTime(32);
  });
  expect(uiStore.getState()).toMatchObject({ sky: false, view: 'tasks', releaseFocus: '.37' });
  const card = screen.getByRole('article', { name: '发布 .37' });
  card.scrollIntoView = vi.fn();
  act(() => vi.advanceTimersByTime(300));
  expect(card.scrollIntoView).toHaveBeenCalledOnce();
  expect(card.getAttribute('data-highlight')).toBe('true');
  expect(screen.getAllByRole('article')).toHaveLength(9);
});
