import '../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SystemTabs } from './SystemTabs';
import { dataStore } from '../../store/dataStore';
import { uiStore } from '../../store/uiStore';
import { sample } from '../../../tests/fixtures/sample';
it('switches systems, supports all, persists the original key and clears pinned star', () => {
  dataStore.setState({
    snapshot: {
      ...sample,
      systems: [
        ...sample.systems,
        { key: 'other', constellation: '天琴', name: '第二系统', sort: 1, app: null, releases: [] },
      ],
    },
  });
  uiStore.setState({ pinned: 2 });
  render(<SystemTabs />);
  fireEvent.click(screen.getByRole('tab', { name: /第二系统/ }));
  expect(uiStore.getState()).toMatchObject({ system: 'other', pinned: -1 });
  expect(localStorage.getItem('board-system')).toBe('other');
  fireEvent.click(screen.getByRole('tab', { name: '全部' }));
  expect(uiStore.getState().system).toBe('all');
});
