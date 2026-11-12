import '../../tests/support';
import { it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useKeyboard } from './useKeyboard';
import { dataStore } from '../store/dataStore';
import { DipCard } from '../components/DipCard/DipCard';
import { StarCard } from '../components/StarCard/StarCard';
import { openDip } from '../store/uiStore';
import { selectStar, selectFromSky } from './skyBridge';
import { uiStore } from '../store/uiStore';
function Keys() {
  useKeyboard();
  return <input aria-label="输入" />;
}
it('closes task, group and sky one layer at a time; clears pinned star on the board', () => {
  uiStore.setState({ sky: true, dip: -1, selected: 'EXPORT', pinned: 2 });
  const { container } = render(<Keys />);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(uiStore.getState()).toMatchObject({ selected: null, dip: -1, sky: true });
  openDip(3);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(uiStore.getState()).toMatchObject({ dip: -1, sky: true });
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(uiStore.getState().sky).toBe(false);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(uiStore.getState().pinned).toBe(-1);
  fireEvent.keyDown(container.querySelector('input')!, { key: 's' });
  expect(uiStore.getState().sky).toBe(false);
  fireEvent.keyDown(window, { key: 'S' });
  expect(uiStore.getState().sky).toBe(true);
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(uiStore.getState().selected).toBe('REPORT');
});

it.each([
  ['ArrowRight', 'WAIT-OLD'],
  ['ArrowLeft', 'WAIT-NEW'],
])('replaces a group with its first/last task on %s, then follows the existing global flow', (key, id) => {
  const snapshot = dataStore.getState().snapshot!,
    base = snapshot.tasks[0]!;
  dataStore.setState({
    snapshot: {
      ...snapshot,
      tasks: [
        { ...base, id: 'WAIT-NEW', lane: 'waiting', sort: 0, waitingSince: '2026-11-11T00:00:00Z' },
        { ...base, id: 'WAIT-OLD', lane: 'waiting', sort: 9, waitingSince: '2026-11-01T00:00:00Z' },
        { ...base, id: 'AFTER', lane: 'release', sort: 0 },
      ],
    },
  });
  uiStore.setState({ sky: true, query: 'no match', dip: 3 });
  const { getAllByRole } = render(
    <>
      <Keys />
      <DipCard />
      <StarCard />
    </>,
  );
  fireEvent.keyDown(window, { key });
  expect(uiStore.getState()).toMatchObject({ selected: id, dip: -1 });
  expect(getAllByRole('dialog')).toHaveLength(1);
  uiStore.setState({ query: '' });
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(uiStore.getState().selected).toBe(id === 'WAIT-OLD' ? 'AFTER' : 'WAIT-OLD');
  expect(getAllByRole('dialog')).toHaveLength(1);
});
it('keeps card selection exclusive for pointer, list and keyboard entry points', () => {
  uiStore.setState({ sky: true });
  openDip(3);
  selectStar('EXPORT');
  expect(uiStore.getState()).toMatchObject({ selected: 'EXPORT', dip: -1 });
  openDip(4);
  expect(uiStore.getState()).toMatchObject({ selected: null, dip: 4 });
  selectFromSky('REPORT');
  expect(uiStore.getState()).toMatchObject({ selected: 'REPORT', dip: -1 });
});
