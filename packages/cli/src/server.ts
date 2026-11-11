import { router, type ServeOptions } from './httpRouter.js';
import { createServer, get, type Server } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import type { Database } from './db/connection.js';
import { transaction } from './db/connection.js';
import { snapshot } from './export/snapshot.js';

// Bundled CLI lives in plugin/bin next to plugin/assets; from source (tests) the page sits in the repo's plugin/assets.
const candidates = [
  new URL('../assets/index.html', import.meta.url),
  new URL('../../../plugin/assets/index.html', import.meta.url),
];
export const asset = candidates.find((u) => existsSync(u)) ?? candidates[0]!;
export function page(file: string | URL = asset): string {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    throw new Error('请先构建前端：pnpm --filter @polaris/web build（缺少 plugin/assets/index.html）');
  }
}
function alreadyPolaris(port: number, readonly: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const req = get(`http://127.0.0.1:${port}/data.json`, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => {
        text += chunk;
        if (text.length > 16 * 1024 * 1024) {
          req.destroy();
          resolve(false);
        }
      });
      res.on('end', () => {
        try {
          const value = JSON.parse(text);
          resolve(
            (!readonly || res.headers['x-polaris-readonly'] === '1') &&
              ((value?.schema === 1 &&
                Array.isArray(value.tasks) &&
                Array.isArray(value.systems) &&
                Array.isArray(value.requirements) &&
                Array.isArray(value.events)) ||
                Boolean(value?.board && value?.log && Array.isArray(value?.tasks))),
          );
        } catch {
          resolve(false);
        }
      });
      res.on('error', () => resolve(false));
    });
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}
export interface HttpResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body: string): void;
}
export function handler(db: Database, html: string) {
  return (req: { url?: string }, res: HttpResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Polaris', '1');
    const path = req.url?.split('?')[0];
    try {
      if (path === '/' || path === '/index.html') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      } else if (path === '/data.json') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(transaction(db, () => snapshot(db))));
      } else {
        res.statusCode = 404;
        res.end('未找到');
      }
    } catch {
      res.statusCode = 500;
      res.end('读取数据失败');
    }
  };
}
export async function serve(db: Database, port = 8790, file: string | URL = asset, options: ServeOptions = {}) {
  const html = page(file);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('--port 必须是 0～65535 的整数');
  const server: Server = createServer(
    router(
      db,
      html,
      options,
      () => {
        const address = server.address();
        return typeof address === 'object' && address ? address.port : port;
      },
      handler(db, html),
    ),
  );
  const result = await new Promise<{ port: number; alreadyRunning: boolean }>((resolve, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EADDRINUSE') {
        reject(error);
        return;
      }
      void alreadyPolaris(port, Boolean(options.readonly)).then((yes) => {
        if (yes) resolve({ port, alreadyRunning: true });
        else reject(new Error(`端口 ${port} 已被占用或现有服务不是只读模式，请先停止已有服务或用 --port 指定其他端口`));
      });
    });
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      resolve({ port: typeof address === 'object' && address ? address.port : port, alreadyRunning: false });
    });
  });
  return { server, ...result };
}
