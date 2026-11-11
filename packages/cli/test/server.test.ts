import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { get } from 'node:http';
import type { Server } from 'node:http';
import { expect, test } from 'vitest';
import { DATA_SLOT, readEmbedded, validateSnapshot, type Snapshot } from '@polaris/core';
import { boot, temp } from './helpers.js';
import { serve, page, handler } from '../src/server.js';
import { mirror } from '../src/commands/mirror.js';
import { snapshot } from '../src/export/snapshot.js';

function request(port: number, path: string): Promise<{ code: number | undefined; text: string }> {
  return new Promise((resolve, reject) => {
    get(`http://127.0.0.1:${port}${path}`, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => {
        text += chunk;
      });
      res.on('end', () => resolve({ code: res.statusCode, text }));
      res.on('error', reject);
    }).on('error', reject);
  });
}
function close(server: Server) {
  return new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

test('serve binds only loopback, reads live snapshots on every request and recognizes an existing Polaris', async ({
  skip,
}) => {
  const { db, write } = boot();
  const file = join(temp(), 'index.html');
  writeFileSync(file, `<html>${DATA_SLOT}</html>`);
  let running: Awaited<ReturnType<typeof serve>>;
  try {
    running = await serve(db, 0, file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EPERM') {
      skip('当前沙箱拒绝监听 127.0.0.1；在允许本机端口的环境自动执行此集成测试');
      return;
    }
    throw error;
  }
  try {
    expect(running.server.address()).toMatchObject({ address: '127.0.0.1' });
    expect((await request(running.port, '/')).text).toContain(DATA_SLOT);
    expect((await request(running.port, '/missing')).code).toBe(404);
    const data = JSON.parse((await request(running.port, '/data.json')).text) as Snapshot;
    expect(validateSnapshot(data).filter((i) => i.level === 'error')).toEqual([]);
    expect(data.tasks).toHaveLength(0);
    write('task', 'add', 'T1', '--system', 'beidou', '--title', '实时任务');
    expect(JSON.parse((await request(running.port, '/data.json')).text).tasks).toHaveLength(1);
    const writable = await serve(db, 0, file, { config: { home: temp(), path: '', actor: 'web' } });
    try {
      await expect(serve(db, writable.port, file, { readonly: true })).rejects.toThrow('现有服务不是只读模式');
    } finally {
      await close(writable.server);
    }
    const second = await serve(db, running.port, file);
    expect(second.alreadyRunning).toBe(true);
    expect(second.server.listening).toBe(false);
  } finally {
    await close(running.server);
  }
});

test('serve and mirror report a missing frontend without falling back to the old page', async () => {
  const { db } = boot(),
    missing = join(temp(), 'missing.html');
  expect(() => page(missing)).toThrow('请先构建前端');
  await expect(serve(db, 0, missing)).rejects.toThrow('请先构建前端');
  expect(() => mirror(snapshot(db), join(temp(), 'out.html'), missing)).toThrow('请先构建前端');
});

test('mirror embeds the exact snapshot with core DATA_SLOT and readEmbedded', () => {
  const { db, write } = boot();
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '</script><script>alert(1)</script>');
  const dir = temp(),
    html = join(dir, 'index.html'),
    out = join(dir, 'build', 'mirror.html');
  writeFileSync(html, `<!doctype html><html><head></head><body>${DATA_SLOT}</body></html>`);
  const data = snapshot(db);
  mirror(data, out, html);
  const text = readFileSync(out, 'utf8');
  const content = /<script id="polaris-data" type="application\/json">([\s\S]*?)<\/script>/.exec(text)![1];
  expect(readEmbedded(content)).toEqual(data);
  expect(text).not.toContain('<script>alert(1)</script>');
  expect(text).not.toContain(DATA_SLOT);
});

test('HTTP handler serves live valid snapshots, page and 404 without requiring socket permissions', () => {
  const { db, write } = boot(),
    handle = handler(db, '<html>北辰</html>');
  const response = () => ({
    statusCode: 200,
    headers: new Map<string, string>(),
    body: '',
    setHeader(name: string, value: string) {
      this.headers.set(name, value);
    },
    end(body: string) {
      this.body = body;
    },
  });
  const first = response();
  handle({ url: '/data.json' }, first);
  expect(validateSnapshot(JSON.parse(first.body)).filter((i) => i.level === 'error')).toEqual([]);
  expect(JSON.parse(first.body).tasks).toHaveLength(0);
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '实时任务');
  const second = response();
  handle({ url: '/data.json?t=1' }, second);
  expect(JSON.parse(second.body).tasks).toHaveLength(1);
  expect(second.headers.get('Cache-Control')).toBe('no-store');
  const html = response();
  handle({ url: '/' }, html);
  expect(html.body).toBe('<html>北辰</html>');
  const missing = response();
  handle({ url: '/other' }, missing);
  expect(missing.statusCode).toBe(404);
});
