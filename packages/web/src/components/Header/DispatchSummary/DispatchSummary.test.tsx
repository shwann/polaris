import '../../../../tests/support';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { SystemInfo } from '@polaris/core';
import { dataStore } from '../../../store/dataStore';
import { DispatchSummary } from './DispatchSummary';

const current = {
  system: 'main',
  engine: 'codex' as const,
  model: 'gpt-6.1-sol',
  effort: 'xhigh',
  note: '用户原话',
  by: '用户',
  actor: 'test',
  setAt: '2026-11-13T02:00:00Z',
  source: 'system' as const,
};
const system: SystemInfo = {
  key: 'main',
  constellation: '北斗',
  name: '测试',
  sort: 0,
  app: null,
  releases: [],
  dispatch: { current, history: [current] },
};
const credentials = { token: 'test-token', page: 'test-page' };

it('renders a local writable button preserving the original note as title', () => {
  dataStore.setState({ origin: 'local', credentials });
  render(<DispatchSummary systems={[system]} all={false} />);
  expect(screen.getByRole('button', { name: /派工 Codex/ }).title).toBe('用户原话');
});
it.each(['local', 'mirror', 'db'] as const)(
  'keeps %s without local write credentials as plain text with no dialog',
  (origin) => {
    dataStore.setState({ origin, credentials: origin === 'local' ? null : credentials });
    render(<DispatchSummary systems={[system]} all={false} />);
    expect(screen.getByTitle('用户原话').tagName).toBe('P');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  },
);
it('offers unset dispatch only in a single-system writable view with Codex defaults', () => {
  dataStore.setState({ origin: 'local', credentials });
  const unset = { ...system, dispatch: undefined };
  const { rerender } = render(<DispatchSummary systems={[unset]} all={true} />);
  expect(screen.queryByRole('button')).toBeNull();
  rerender(<DispatchSummary systems={[unset]} all={false} />);
  fireEvent.click(screen.getByRole('button', { name: '派工 未设置' }));
  expect((screen.getByLabelText('模型') as HTMLSelectElement).value).toBe('gpt-6.1-sol');
  expect((screen.getByLabelText('思考强度') as HTMLSelectElement).value).toBe('xhigh');
  expect((screen.getByRole('button', { name: '确定' }) as HTMLButtonElement).disabled).toBe(false);
});
it('opens each system independently in all-systems view and titles the dialog with its constellation', () => {
  dataStore.setState({ origin: 'local', credentials });
  const other = {
    ...system,
    key: 'other',
    constellation: '猎户',
    dispatch: { current: { ...current, system: 'other', model: 'other-model' }, history: [] },
  };
  render(<DispatchSummary systems={[system, other]} all={true} />);
  fireEvent.click(screen.getByRole('button', { name: /猎户 派工/ }));
  expect(screen.getByRole('dialog', { name: '猎户 派工设置' })).toBeTruthy();
  expect((screen.getByLabelText('模型') as HTMLSelectElement).value).toBe('other-model');
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  fireEvent.click(screen.getByRole('button', { name: /北斗 派工/ }));
  expect(screen.getByRole('dialog', { name: '北斗 派工设置' })).toBeTruthy();
});
