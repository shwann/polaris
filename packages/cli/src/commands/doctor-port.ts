import { createServer } from 'node:net';
import { get } from 'node:http';

export interface PortResult {
  ok: boolean;
  occupied: boolean;
  polaris: boolean;
  detail: string;
}
export async function inspectPort(port = 8790): Promise<PortResult> {
  const error = await new Promise<NodeJS.ErrnoException | undefined>((resolve) => {
    const server = createServer();
    server.once('error', resolve);
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(undefined)));
  });
  if (!error) return { ok: true, occupied: false, polaris: false, detail: `端口 ${port} 空闲` };
  if (error.code !== 'EADDRINUSE')
    return { ok: false, occupied: false, polaris: false, detail: `端口 ${port} 检查失败：${error.message}` };
  const polaris = await new Promise<boolean>((resolve) => {
    const req = get(`http://127.0.0.1:${port}/data.json`, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => {
        text += chunk;
        if (text.length > 1024 * 1024) {
          req.destroy();
          resolve(false);
        }
      });
      res.on('end', () => {
        try {
          const data = JSON.parse(text);
          resolve(
            res.statusCode === 200 &&
              res.headers['x-polaris'] === '1' &&
              data.schema === 1 &&
              ['systems', 'tasks', 'requirements', 'events'].every((key) => Array.isArray(data[key])),
          );
        } catch {
          resolve(false);
        }
      });
      res.on('error', () => resolve(false));
    });
    const timer = setTimeout(() => {
      req.destroy();
      resolve(false);
    }, 1000);
    req.on('close', () => clearTimeout(timer));
    req.on('error', () => resolve(false));
  });
  return {
    ok: polaris,
    occupied: true,
    polaris,
    detail: `端口 ${port} ${polaris ? '已由北辰使用' : '被其他程序占用；请用 serve --port 8791'}`,
  };
}
