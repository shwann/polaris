import { normalize } from './normalize';
import type { Origin } from './DataSource';

export interface LocalCredentials {
  token: string;
  page: string;
}
export type WritePath = '/api/task/move' | '/api/task/progress' | '/api/req/move' | '/api/req/check' | '/api/undo';
let version = 0;
let pending = false;
export const localWriteVersion = () => version;
export const localWritePending = () => pending;
export function localCredentials(
  origin: Origin,
  page = document,
  url: Pick<Location, 'protocol' | 'hostname'> = window.location,
): LocalCredentials | null {
  if (origin !== 'local' || url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) return null;
  const token = page.querySelector<HTMLMetaElement>('meta[name="polaris-token"]')?.content;
  const session = page.querySelector<HTMLMetaElement>('meta[name="polaris-page"]')?.content;
  return token && session ? { token, page: session } : null;
}
export async function localWrite(
  credentials: LocalCredentials,
  path: WritePath,
  body: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
) {
  version++;
  pending = true;
  try {
    const response = await fetcher(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Polaris-Token': credentials.token,
        'X-Polaris-Page': credentials.page,
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok || !result.ok)
      throw new Error(typeof result.error === 'string' ? result.error : '修改失败，请重试');
    return {
      batch: String(result.batch),
      snapshot: normalize(result.snapshot),
      warning: result.warning as string | undefined,
    };
  } catch (error) {
    if (error instanceof Error && /[\u3400-\u9fff]/u.test(error.message)) throw error;
    throw new Error('连接本机看板失败，请刷新页面后重试', { cause: error });
  } finally {
    version++;
    pending = false;
  }
}
