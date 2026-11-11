import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Database } from './db/connection.js';
import type { Config } from './config.js';
import { checkHost, readWriteBody, HttpError } from './httpSecurity.js';
import { executeHttpWrite } from './httpWrite.js';

export interface ServeOptions {
  config?: Config;
  readonly?: boolean;
}
export function router(
  db: Database,
  html: string,
  options: ServeOptions,
  port: () => number,
  read: (req: IncomingMessage, res: ServerResponse) => void,
) {
  const token = options.readonly || !options.config ? undefined : randomBytes(32).toString('hex');
  const pages = new Map<string, Set<string>>();
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Polaris-Readonly', token ? '0' : '1');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    try {
      checkHost(req, port());
      const path = req.url?.split('?')[0] ?? '';
      if (path.startsWith('/api/')) {
        const body = await readWriteBody(req, token);
        const session = req.headers['x-polaris-page'];
        const batches = typeof session === 'string' ? pages.get(session) : undefined;
        if (!batches) throw new HttpError(403, '页面会话已失效，请刷新页面');
        const result = executeHttpWrite(db, options.config!, path, body, batches);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(result));
      } else if ((path === '/' || path === '/index.html') && token) {
        const session = randomBytes(24).toString('hex');
        if (pages.size >= 128) pages.delete(pages.keys().next().value!);
        pages.set(session, new Set());
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`<meta name="polaris-token" content="${token}"><meta name="polaris-page" content="${session}">` + html);
      } else read(req, res);
    } catch (error) {
      res.statusCode = error instanceof HttpError ? error.status : 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      const message = error instanceof Error ? error.message : '';
      res.end(
        JSON.stringify({
          ok: false,
          error: /[\u3400-\u9fff]/u.test(message) ? message : '修改失败，请检查编号、状态和数值范围',
        }),
      );
      req.resume();
    }
  };
}
