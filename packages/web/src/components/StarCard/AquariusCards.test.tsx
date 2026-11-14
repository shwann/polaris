import '../../../tests/support';
import { expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { releaseDetails } from '@polaris/core';
import { StarCard, moveStarCard } from './StarCard';
import { ReleaseLog } from '../ReleaseLog/ReleaseLog';
import { useKeyboard } from '../../hooks/useKeyboard';
import { selectFromSky, selectRelease, releaseNodeId } from '../../hooks/skyBridge';
import { dataStore } from '../../store/dataStore';
import { uiStore, setSky } from '../../store/uiStore';
import { fixture, pointer } from '../../sky/testFixture';
import { attachInput } from '../../sky/input';
import { highlightedItems, releaseStars } from '../../sky/geometry/figures/aquarius';
import { moveAquariusCard } from '../../sky/draw/aquariusSelection';

function Keys() {
  useKeyboard();
  return null;
}
function setup(count = 7) {
  const snapshot = structuredClone(dataStore.getState().snapshot!),
    base = snapshot.tasks[0]!;
  snapshot.systems[0]!.releases = [
    { version: '.32', releasedAt: '2026-11-09T21:20:00+08:00' },
    { version: '.33', tag: 'feature', releasedAt: '2026-11-10T21:20:00+08:00', note: '发布简介第一句。第二句。' },
  ];
  snapshot.tasks = Array.from({ length: count }, (_, i) => ({
    ...base,
    id: `TASK-${i}`,
    code: `CASH${i}`,
    lane: 'done',
    title: `交付任务 ${i}`,
    shippedIn: '.33',
    progress: 100,
    reqIds: ['REQ1'],
    steps: [{ name: '验收', state: 'done' }],
  }));
  snapshot.tasks.push({ ...base, id: 'OTHER', shippedIn: '.32', lane: 'done' });
  snapshot.events = [{ at: '2026-11-10T21:30:00+08:00', taskId: 'TASK-0', text: '验收已通过' }];
  snapshot.requirements = [
    {
      id: 'REQ1',
      systemKey: base.systemKey,
      title: '关联需求标题',
      source: 'user',
      priority: 'P1',
      status: 'confirmed',
      acceptance: [],
      refs: [],
      taskIds: [],
      createdAt: '',
      updatedAt: '',
    },
  ];
  dataStore.setState({ snapshot });
  uiStore.setState({ sky: true });
  const { s, registry } = fixture(true, {
    onPickStar: selectFromSky,
    onPickRelease: selectRelease,
    onSelectedMove: moveStarCard,
  });
  Object.assign(s, { w: 2000, h: 1250, releases: releaseDetails(snapshot.systems[0]!.releases, snapshot.tasks) });
  const off = uiStore.subscribe((u) =>
    Object.assign(s, { selected: u.selected, selectedRelease: u.selectedRelease, deliveryVersion: u.deliveryVersion }),
  );
  releaseStars(s);
  const detach = attachInput(s);
  const view = render(
    <>
      <Keys />
      <StarCard />
      <ReleaseLog />
    </>,
  );
  const click = (point: [number, number], distance = 0) =>
    act(() => {
      pointer('pointerdown', ...point, 0);
      pointer('pointerup', point[0] + distance, point[1], 10);
    });
  return {
    s,
    click,
    view,
    dispose: () => {
      detach();
      off();
      registry.dispose();
    },
  };
}

it('opens the same task HUD from a jar dot with the correct id and read-only task context', () => {
  const { s, click, dispose } = setup();
  const node = s.aquarius!.jar.nodes.find((n) => n.id === 'TASK-0')!;
  click(node.point);
  const dialog = screen.getByRole('dialog', { name: '任务详情' });
  expect(dialog.dataset.starId).toBe('TASK-0');
  expect(within(dialog).getByText('上线于 .33（功能，11-10 21:20）')).toBeTruthy();
  expect(within(dialog).getByText('进度 100%')).toBeTruthy();
  expect(within(dialog).getByText('需求 REQ1 · 关联需求标题')).toBeTruthy();
  expect(within(dialog).getByText('验收已通过')).toBeTruthy();
  expect(within(dialog).queryByRole('textbox')).toBeNull();
  expect(uiStore.getState()).toMatchObject({ sky: true, releaseFocus: null });
  act(() => moveAquariusCard(s, 0));
  expect(s.selected).toBe('TASK-0');
  dispose();
});

it('cycles arrows only through the selected release, ignoring lane and board filters', () => {
  const { s, click, dispose } = setup(3);
  click(s.aquarius!.jar.nodes.find((n) => n.id === 'TASK-0')!.point);
  act(() => uiStore.setState({ query: 'no match', mineOnly: true }));
  for (const id of ['TASK-1', 'TASK-2', 'TASK-0']) {
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(uiStore.getState()).toMatchObject({ selected: id, deliveryVersion: '.33', selectedRelease: null });
  }
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  expect(uiStore.getState().selected).toBe('TASK-2');
  dispose();
});

it('opens a release card, pins exactly seven highlights, and navigates only through its explicit button', () => {
  const { s, click, dispose } = setup();
  click(s.aquarius!.stars.find((n) => n.release.version === '.33')!.point);
  const dialog = screen.getByRole('dialog', { name: '版本详情' });
  expect(within(dialog).getByText('发布简介第一句')).toBeTruthy();
  expect(within(dialog).queryByText('第二句。')).toBeNull();
  expect(highlightedItems(s)).toEqual(new Set(Array.from({ length: 7 }, (_, i) => `TASK-${i}`)));
  expect(uiStore.getState()).toMatchObject({ sky: true, releaseFocus: null });
  fireEvent.click(within(dialog).getByRole('button', { name: '在看板查看发布记录' }));
  expect(uiStore.getState()).toMatchObject({ sky: false, selectedRelease: null, releaseFocus: '.33' });
  expect(document.getElementById(releaseNodeId('.33'))?.dataset.highlight).toBe('true');
  dispose();
});

it('limits a release list to eight plus a remainder and switches a list item into the task card', () => {
  const { s, click, dispose } = setup(10);
  click(s.aquarius!.stars.at(-1)!.point);
  const dialog = screen.getByRole('dialog', { name: '版本详情' });
  expect(within(dialog).getAllByRole('listitem')).toHaveLength(9);
  expect(within(dialog).getByText('+2')).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: 'CASH0 交付任务 0' }));
  expect(screen.getByRole('dialog', { name: '任务详情' }).dataset.starId).toBe('TASK-0');
  expect(uiStore.getState()).toMatchObject({ selectedRelease: null, deliveryVersion: '.33' });
  dispose();
});

it.each(['Escape', 'blank', 'close'])('closes and clears persistent release highlights via %s', (method) => {
  const { s, click, dispose } = setup();
  click(s.aquarius!.stars.at(-1)!.point);
  if (method === 'Escape') fireEvent.keyDown(window, { key: 'Escape' });
  else if (method === 'blank') click([700, 400]);
  else fireEvent.click(screen.getByRole('button', { name: '关闭' }));
  expect(uiStore.getState()).toMatchObject({ selectedRelease: null, selected: null, sky: true });
  expect(highlightedItems(s).size).toBe(0);
  expect(screen.queryByRole('dialog')).toBeNull();
  dispose();
});

it.each(['item', 'release'])('consumes a 5px %s drag without opening any card', (kind) => {
  const { s, click, dispose } = setup();
  const point = kind === 'item' ? s.aquarius!.jar.nodes[2]!.point : s.aquarius!.stars.at(-1)!.point;
  click(point, 5);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(uiStore.getState()).toMatchObject({ selected: null, selectedRelease: null, sky: true });
  dispose();
});

it('clears Aquarius card context when leaving the sky', () => {
  setup().dispose();
  act(() => {
    selectRelease('.33');
    setSky(false);
  });
  expect(uiStore.getState()).toMatchObject({ selectedRelease: null, deliveryVersion: null });
});
