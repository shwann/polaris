import { expect, test } from 'vitest';
import { snapshot } from '../src/export/snapshot.js';
import { setup } from './httpSetup.js';

const dispatchBody = { system: 'other', engine: 'codex', model: 'gpt-6.1-sol', effort: 'high' };
test('dispatch writes target the requested system, audit web/user, refresh snapshot and undo to the previous setting', async () => {
  const f = setup(),
    headers = await f.page();
  f.write('system', 'add', 'other', '--name', '其他系统');
  f.write('dispatch', 'set', '--system', 'other', '--engine', 'claude', '--model', 'opus', '--effort', 'medium');
  const before = snapshot(f.db).systems.find((s) => s.key === 'other')!.dispatch!.current;
  const response = await f.request(
    '/api/dispatch/set',
    {
      system: ' other ',
      engine: ' codex ',
      model: ' gpt-6.1-sol ',
      effort: ' high ',
      note: ' 用户原话 ',
    },
    { headers },
  );
  expect(response.code).toBe(200);
  const result = response.json();
  expect(result).toMatchObject({ ok: true, batch: expect.any(String) });
  expect(result.snapshot.systems.find((s: { key: string }) => s.key === 'other').dispatch.current).toMatchObject({
    ...dispatchBody,
    note: '用户原话',
    actor: 'web',
    by: '用户',
    source: 'system',
  });
  expect(result.snapshot.systems.find((s: { key: string }) => s.key === 'beidou').dispatch).toBeUndefined();
  expect(f.db.all('SELECT actor FROM changes WHERE batch=?', result.batch).every((r) => r.actor === 'web')).toBe(true);
  const undone = await f.request('/api/undo', { batch: result.batch }, { headers });
  expect(undone.code).toBe(200);
  expect(undone.json().snapshot.systems.find((s: { key: string }) => s.key === 'other').dispatch.current).toEqual(
    before,
  );
});

test.each([undefined, '', '  '])('dispatch defaults an absent or blank note (%s) to 看板修改', async (note) => {
  const f = setup(),
    headers = await f.page();
  const response = await f.request('/api/dispatch/set', { ...dispatchBody, system: 'beidou', note }, { headers });
  expect(response.code).toBe(200);
  expect(response.json().snapshot.systems[0].dispatch.current.note).toBe('看板修改');
});

test.each([
  { effort: 'max' },
  { engine: 'invalid' },
  { model: '' },
  { model: '   ' },
  { model: '模'.repeat(65) },
  { system: 'missing' },
  { system: '   ' },
  { note: '字'.repeat(501) },
  { note: 42 },
])('dispatch rejects invalid input atomically in Chinese: %j', async (invalid) => {
  const f = setup(),
    headers = await f.page(),
    before = f.db.all('SELECT * FROM changes');
  const response = await f.request('/api/dispatch/set', { ...dispatchBody, system: 'beidou', ...invalid }, { headers });
  expect(response.code).toBe(400);
  expect(response.json()).toMatchObject({ ok: false, error: expect.stringMatching(/[\u3400-\u9fff]/u) });
  expect(f.db.all('SELECT * FROM changes')).toEqual(before);
});
