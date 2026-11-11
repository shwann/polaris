import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { boot } from './helpers.js';
import { handler } from '../src/server.js';
import { router } from '../src/httpRouter.js';
import { snapshot } from '../src/export/snapshot.js';

function setup(readonly = false) {
  const f = boot();
  f.write('task', 'add', 'T1', '--system', 'beidou', '--title', '任务');
  f.write('req', 'add', 'R1', '--system', 'beidou', '--title', '需求', '--accept', '第一条', '--accept', '第二条');
  const route = router(
    f.db,
    '<html>北辰</html>',
    { readonly, config: { home: f.home, path: f.path, actor: 'ignored' } },
    () => 8790,
    handler(f.db, '<html>只读</html>'),
  );
  async function request(
    path: string,
    body: unknown = {},
    options: { method?: string; headers?: Record<string, string>; chunks?: string[] } = {},
  ) {
    const req = Object.assign(Readable.from(options.chunks ?? [JSON.stringify(body)]), {
      url: path,
      method: options.method ?? 'POST',
      headers: {
        host: '127.0.0.1:8790',
        origin: 'http://127.0.0.1:8790',
        'content-type': 'application/json',
        ...options.headers,
      },
    }) as IncomingMessage;
    const res = {
      statusCode: 200,
      body: '',
      headers: new Map<string, string>(),
      setHeader(name: string, value: string) {
        this.headers.set(name, value);
      },
      end(value: string) {
        this.body = value;
      },
    };
    await route(req, res as unknown as ServerResponse);
    return { code: res.statusCode, text: res.body, headers: res.headers, json: () => JSON.parse(res.body) };
  }
  async function page() {
    const response = await request('/', {}, { method: 'GET' });
    return {
      'x-polaris-token': /name="polaris-token" content="([^"]+)"/.exec(response.text)?.[1] ?? '',
      'x-polaris-page': /name="polaris-page" content="([^"]+)"/.exec(response.text)?.[1] ?? '',
    };
  }
  return { ...f, request, page };
}

test('all write routes share CLI transactions, audit web events, SQL backup and undo', async () => {
  const f = setup(),
    headers = await f.page();
  const cases: [string, Record<string, unknown>, () => unknown][] = [
    [
      '/api/task/move',
      { id: 'T1', lane: 'waiting', status: '等答复' },
      () =>
        expect(snapshot(f.db).tasks[0]).toMatchObject({
          lane: 'waiting',
          status: '等答复',
          waitingSince: expect.any(String),
        }),
    ],
    ['/api/task/progress', { id: 'T1', progress: 65 }, () => expect(snapshot(f.db).tasks[0]?.progress).toBe(65)],
    [
      '/api/req/move',
      { id: 'R1', status: '已确认' },
      () => expect(snapshot(f.db).requirements[0]?.status).toBe('confirmed'),
    ],
    [
      '/api/req/check',
      { id: 'R1', item: 2, met: true },
      () =>
        expect(snapshot(f.db).requirements[0]?.acceptance).toEqual([
          { text: '第一条', met: false },
          { text: '第二条', met: true },
        ]),
    ],
  ];
  for (const [path, body, verify] of cases) {
    const before = snapshot(f.db),
      response = await f.request(path, body, { headers });
    expect(response.code).toBe(200);
    const result = response.json();
    expect(result.ok).toBe(true);
    expect(result.snapshot).toEqual(snapshot(f.db, result.snapshot.generatedAt));
    verify();
    const changes = f.db.all('SELECT * FROM changes WHERE batch=?', result.batch);
    expect(changes.length).toBeGreaterThan(0);
    expect(changes.every((c) => c.actor === 'web')).toBe(true);
    expect(changes.some((c) => c.entity === 'events')).toBe(true);
    expect(result.snapshot.events[0].text).toContain('[web]');
    expect(readFileSync(join(f.home, 'backup/polaris.sql'), 'utf8')).toContain(result.batch);
    const undone = await f.request('/api/undo', { batch: result.batch }, { headers });
    expect(undone.json()).toMatchObject({ ok: true, batch: expect.any(String) });
    expect(undone.json().snapshot.tasks).toEqual(before.tasks);
    expect(undone.json().snapshot.requirements).toEqual(before.requirements);
    expect(
      f.db.all('SELECT actor FROM changes WHERE batch=?', undone.json().batch).every((c) => c.actor === 'web'),
    ).toBe(true);
    expect((await f.request('/api/undo', { batch: result.batch }, { headers })).code).toBe(403);
  }
});

test('check can unset one criterion, rejects invalid input atomically and uses the shared CLI command', async () => {
  const f = setup(),
    headers = await f.page();
  f.write('req', 'check', 'R1', '--item', '1');
  expect(snapshot(f.db).requirements[0]?.acceptance[0]?.met).toBe(true);
  expect((await f.request('/api/req/check', { id: 'R1', item: 1, met: false }, { headers })).json().ok).toBe(true);
  expect(snapshot(f.db).requirements[0]?.acceptance[0]?.met).toBe(false);
  const before = f.db.all('SELECT * FROM changes');
  for (const item of [0, -1, 1.5, 3]) {
    expect((await f.request('/api/req/check', { id: 'R1', item, met: true }, { headers })).json()).toMatchObject({
      ok: false,
      error: expect.stringMatching(/[\u3400-\u9fff]/u),
    });
  }
  for (const [path, body] of [
    ['/api/task/progress', { id: 'T1', progress: 101 }],
    ['/api/task/move', { id: 'T1', lane: 'invalid' }],
    ['/api/req/move', { id: 'R1', status: 'invalid' }],
    ['/api/req/check', { id: 'R1', item: 1, met: 'yes' }],
  ] as const)
    expect((await f.request(path, body, { headers })).json().ok).toBe(false);
  expect(f.db.all('SELECT * FROM changes')).toEqual(before);
});

test('rejects absent or invalid tokens, cross-site Origin, DNS rebinding, non-JSON, GET and oversized streamed bodies', async () => {
  const f = setup(),
    headers = await f.page(),
    body = { id: 'T1', progress: 50 };
  const rejects = [
    { headers: {}, code: 403 },
    { headers: { ...headers, 'x-polaris-token': 'wrong' }, code: 403 },
    { headers: { ...headers, origin: 'https://evil.test' }, code: 403 },
    { headers: { ...headers, host: 'evil.test:8790' }, code: 403 },
    { headers: { ...headers, host: '127.0.0.1:9999' }, code: 403 },
    { headers: { ...headers, 'content-type': 'text/plain' }, code: 415 },
    { headers, method: 'GET', code: 405 },
    { headers: { ...headers, 'content-length': '65537' }, code: 413 },
    { headers, chunks: ['x'.repeat(40000), 'x'.repeat(30000)], code: 413 },
    { headers, chunks: ['{invalid'], code: 400 },
    { headers, chunks: ['[]'], code: 400 },
    { headers: { ...headers, 'x-polaris-page': 'unknown' }, code: 403 },
  ];
  const before = f.db.all('SELECT * FROM changes');
  for (const { code, ...options } of rejects) {
    const response = await f.request('/api/task/progress', body, options);
    expect(response.code).toBe(code);
    expect(response.json()).toMatchObject({ ok: false, error: expect.stringMatching(/[\u3400-\u9fff]/u) });
  }
  expect(f.db.all('SELECT * FROM changes')).toEqual(before);
  expect((await f.request('/data.json', {}, { method: 'GET', headers: { host: 'evil.test:8790' } })).code).toBe(403);
  expect(
    (
      await f.request('/api/task/progress', body, { headers: { ...headers, origin: '', host: 'localhost:8790' } })
    ).json().ok,
  ).toBe(true);
});

test('readonly injects no credentials and refuses every write route', async () => {
  const f = setup(true);
  expect((await f.request('/', {}, { method: 'GET' })).headers.get('X-Polaris-Readonly')).toBe('1');
  expect(await f.page()).toEqual({ 'x-polaris-token': '', 'x-polaris-page': '' });
  for (const path of ['/api/task/move', '/api/task/progress', '/api/req/move', '/api/req/check', '/api/undo']) {
    expect((await f.request(path)).code).toBe(403);
  }
});

test('undo rejects CLI batches, other pages, and later conflicting edits', async () => {
  const f = setup(),
    first = await f.page(),
    second = await f.page();
  expect(second['x-polaris-token']).toBe(first['x-polaris-token']);
  expect(second['x-polaris-page']).not.toBe(first['x-polaris-page']);
  const cli = f.write('task', 'update', 'T1', '--progress', '5');
  expect((await f.request('/api/undo', { batch: cli.batch }, { headers: first })).code).toBe(403);
  const result = (await f.request('/api/task/progress', { id: 'T1', progress: 10 }, { headers: first })).json();
  expect((await f.request('/api/undo', { batch: result.batch }, { headers: second })).code).toBe(403);
  f.write('task', 'update', 'T1', '--progress', '20');
  expect((await f.request('/api/undo', { batch: result.batch }, { headers: first })).json()).toMatchObject({
    ok: false,
    error: expect.stringContaining('后续命令'),
  });
  expect(snapshot(f.db).tasks[0]?.progress).toBe(20);
});

test('committed writes still return their batch and snapshot when backup fails', async () => {
  const f = setup(),
    headers = await f.page();
  writeFileSync(join(f.home, 'backup'), 'blocked');
  const result = (await f.request('/api/task/progress', { id: 'T1', progress: 55 }, { headers })).json();
  expect(result).toMatchObject({ ok: true, batch: expect.any(String), warning: expect.stringContaining('数据已保存') });
  expect(result.snapshot.tasks[0].progress).toBe(55);
  expect((await f.request('/api/undo', { batch: result.batch }, { headers })).json().ok).toBe(true);
});

test('tokens differ per server and task status remains literal free text', async () => {
  const a = setup(),
    b = setup(),
    headers = await a.page();
  expect(headers['x-polaris-token']).not.toBe((await b.page())['x-polaris-token']);
  const result = (
    await a.request('/api/task/move', { id: 'T1', lane: 'doing', status: '--free-text' }, { headers })
  ).json();
  expect(result.snapshot.tasks[0].status).toBe('--free-text');
});
