import '../../../../tests/support';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useStore } from 'zustand';
import type { DispatchSetting, SystemInfo } from '@polaris/core';
import { dataStore } from '../../../store/dataStore';
import { sample } from '../../../../tests/fixtures/sample';
import { DispatchSummary } from '../DispatchSummary/DispatchSummary';
import { WriteNotice } from '../../LocalEdit/WriteNotice';

const current: DispatchSetting = {
  system: 'main',
  engine: 'codex',
  model: 'historic-codex',
  effort: 'high',
  note: '原话',
  by: '用户',
  actor: 'test',
  setAt: '2026-11-13T02:00:00Z',
  source: 'system',
};
const system: SystemInfo = {
  ...sample.systems[0]!,
  dispatch: {
    current,
    history: [current, current, { ...current, engine: 'claude', model: 'historic-claude' }],
    models: { codex: ['older-than-five', 'historic-codex'], claude: ['historic-claude'] },
  },
};
function open(selected = system) {
  dataStore.setState({ origin: 'local', credentials: { token: 'test-token', page: 'test-page' } });
  function Summary() {
    const snapshot = useStore(dataStore, (s) => s.snapshot);
    return <DispatchSummary systems={[snapshot?.systems[0]?.dispatch ? snapshot.systems[0] : selected]} all={false} />;
  }
  render(
    <>
      <Summary />
      <WriteNotice />
    </>,
  );
  const trigger = screen.getByRole('button', { name: /派工/ });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
}
const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement;
const confirm = () => screen.getByRole('button', { name: '确定' }) as HTMLButtonElement;

it('focuses the first control, disables unchanged submission and allows a note-only change', () => {
  open();
  expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Codex' }));
  expect(confirm().disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('说明（选填）'), { target: { value: '   ' } });
  expect(confirm().disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('说明（选填）'), { target: { value: '再确认' } });
  expect(confirm().disabled).toBe(false);
});
it('switches effort choices and defaults, and restores the active engine settings', () => {
  open();
  expect([...select('思考强度').options].map((o) => [o.value, o.text])).toEqual([
    ['minimal', '最低'],
    ['low', '低'],
    ['medium', '中'],
    ['high', '高'],
    ['xhigh', '极高'],
  ]);
  fireEvent.click(screen.getByRole('radio', { name: 'Claude' }));
  expect([...select('思考强度').options].map((o) => o.value)).toEqual(['low', 'medium', 'high', 'xhigh', 'max']);
  expect(select('思考强度').value).toBe('medium');
  expect(select('模型').value).toBe('opus');
  fireEvent.change(select('思考强度'), { target: { value: 'max' } });
  fireEvent.click(screen.getByRole('radio', { name: 'Codex' }));
  expect(select('思考强度').value).toBe('high');
  expect(select('模型').value).toBe('historic-codex');
});
it('uses Codex defaults when switching away from active Claude settings', () => {
  open({
    ...system,
    dispatch: { current: { ...current, engine: 'claude', model: 'sonnet', effort: 'max' }, history: [] },
  });
  expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Claude' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Codex' }));
  expect(select('模型').value).toBe('gpt-6.1-sol');
  expect(select('思考强度').value).toBe('xhigh');
  fireEvent.click(screen.getByRole('radio', { name: 'Claude' }));
  expect(select('模型').value).toBe('sonnet');
  expect(select('思考强度').value).toBe('max');
});
it('deduplicates same-engine history including older models and supports custom model entry', () => {
  open();
  expect([...select('模型').options].map((o) => o.text)).toEqual([
    'gpt-6.1-sol',
    'older-than-five',
    'historic-codex',
    '其他…',
  ]);
  fireEvent.change(select('模型'), { target: { value: '' } });
  expect(screen.getByLabelText('自定义模型')).toBeTruthy();
  expect(confirm().disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('自定义模型'), { target: { value: ' custom-model ' } });
  expect(confirm().disabled).toBe(false);
});
it('posts the correct body and credentials, locks controls, closes on success and offers undo', async () => {
  const trigger = open();
  let resolve!: (value: Response) => void;
  const fetcher = vi.fn().mockReturnValue(
    new Promise<Response>((done) => {
      resolve = done;
    }),
  );
  vi.stubGlobal('fetch', fetcher);
  fireEvent.change(select('思考强度'), { target: { value: 'xhigh' } });
  fireEvent.click(confirm());
  expect(dataStore.getState().writing).toBe(true);
  for (const el of screen.getByRole('dialog').querySelectorAll('input,select,textarea,button'))
    expect(el.matches(':disabled')).toBe(true);
  expect(fetcher.mock.calls[0]).toEqual([
    '/api/dispatch/set',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'X-Polaris-Token': 'test-token', 'X-Polaris-Page': 'test-page' }),
    }),
  ]);
  expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({
    system: system.key,
    engine: 'codex',
    model: 'historic-codex',
    effort: 'xhigh',
    note: '',
  });
  const updated = { ...current, effort: 'xhigh', note: '看板修改', actor: 'web' };
  await act(async () => {
    resolve(
      new Response(
        JSON.stringify({
          ok: true,
          batch: 'B',
          snapshot: {
            ...sample,
            systems: [{ ...system, dispatch: { current: updated, history: [updated, current] } }],
          },
        }),
      ),
    );
  });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(dataStore.getState().snapshot?.systems[0]?.dispatch?.current).toEqual(updated);
  expect(trigger.textContent).toContain('historic-codex / 极高');
  expect(screen.getByRole('status').textContent).toContain('已修改：派工 Codex historic-codex / 极高');
  expect(screen.getByRole('button', { name: '撤销' })).toBeTruthy();
});
it('keeps the dialog and entered fields on failure with a Chinese notice', async () => {
  open();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: '找不到系统' }), { status: 400 })),
  );
  fireEvent.change(select('思考强度'), { target: { value: 'low' } });
  fireEvent.click(confirm());
  await act(async () => {});
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(select('思考强度').value).toBe('low');
  expect(screen.getByRole('alert').textContent).toBe('找不到系统');
  expect(confirm().disabled).toBe(false);
});
it.each(['Escape', 'backdrop', 'cancel'])('closes with %s and returns focus to its trigger', (method) => {
  const trigger = open();
  if (method === 'Escape') fireEvent.keyDown(window, { key: 'Escape' });
  else if (method === 'backdrop') fireEvent.click(screen.getByRole('dialog').parentElement!);
  else fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
it('traps keyboard focus at both ends including a selected second radio', () => {
  open();
  fireEvent.change(select('思考强度'), { target: { value: 'low' } });
  confirm().focus();
  fireEvent.keyDown(confirm(), { key: 'Tab' });
  expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Codex' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Claude' }));
  const claude = screen.getByRole('radio', { name: 'Claude' });
  claude.focus();
  fireEvent.keyDown(claude, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(confirm());
});
