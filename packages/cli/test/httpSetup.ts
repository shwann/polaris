import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { boot } from './helpers.js';
import { handler } from '../src/server.js';
import { router } from '../src/httpRouter.js';

export function setup(readonly = false) {
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
