import type { IncomingMessage } from 'node:http';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function checkHost(req: IncomingMessage, port: number): void {
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host ?? ''))
    throw new HttpError(403, '请求主机不受信任');
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)
    throw new HttpError(403, '请求来源不受信任');
}
export async function readWriteBody(req: IncomingMessage, token: string | undefined): Promise<Record<string, unknown>> {
  if (!token) throw new HttpError(403, '看板处于只读模式');
  if (req.method !== 'POST') throw new HttpError(405, '写入只接受 POST 请求');
  if (req.headers['x-polaris-token'] !== token) throw new HttpError(403, '写入令牌无效，请刷新页面');
  if (req.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !== 'application/json')
    throw new HttpError(415, '写入只接受 JSON 数据');
  if (Number(req.headers['content-length']) > 65536) throw new HttpError(413, '请求体不能超过 64KB');
  const chunks: Buffer[] = [];
  let size = 0;
  // Keep the socket open so rejected streamed bodies still receive a JSON error.
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    const buffer = Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > 65536) throw new HttpError(413, '请求体不能超过 64KB');
    chunks.push(buffer);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, '请求体必须是有效 JSON 对象');
  }
}
