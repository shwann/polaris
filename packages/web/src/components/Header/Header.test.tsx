import '../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';
import { dataStore } from '../../store/dataStore';
import { uiStore } from '../../store/uiStore';
import { dispatchDate, type DispatchSetting } from '@polaris/core';

const current: DispatchSetting = {
  system: 'main',
  engine: 'codex',
  model: 'gpt-6.1-sol',
  effort: 'xhigh',
  note: '用户原话：按此派工',
  by: '用户',
  actor: 'test',
  setAt: '2026-11-13T02:00:00Z',
  source: 'system',
};
it('shows the selected system dispatch with the original note as title and changes with the system tab', () => {
  const snapshot = structuredClone(dataStore.getState().snapshot!);
  snapshot.systems[0]!.dispatch = { current, history: [current] };
  snapshot.systems.push({ ...snapshot.systems[0]!, key: 'other', name: '其他系统', dispatch: undefined });
  dataStore.setState({ snapshot });
  const { rerender } = render(<Header />);
  const line = screen.getByTitle(current.note);
  expect(line.textContent).toBe(`派工 Codex gpt-6.1-sol / 极高 · ${dispatchDate(current.setAt)} 用户定`);
  uiStore.setState({ system: 'other' });
  rerender(<Header />);
  expect(screen.queryByTitle(current.note)).toBeNull();
});
it('keeps old snapshots without dispatch renderable', () => {
  render(<Header />);
  expect(screen.queryByText(/派工 /)).toBeNull();
});
