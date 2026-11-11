import { transaction } from './db/connection.js';
import type { Database } from './db/connection.js';
import type { Config } from './config.js';
import { executeWrite } from './commands/write.js';
import type { Parsed } from './commands/args.js';
import { snapshot } from './export/snapshot.js';
import { backup } from './export/backup.js';
import { HttpError } from './httpSecurity.js';

export function executeHttpWrite(
  db: Database,
  cfg: Config,
  path: string,
  body: Record<string, unknown>,
  batches: Set<string>,
) {
  const text = (key: string) => {
    if (typeof body[key] !== 'string' || !body[key]) throw new HttpError(400, `请提供有效的 ${key}`);
    return body[key];
  };
  const number = (key: string) => {
    if (typeof body[key] !== 'number' || !Number.isFinite(body[key])) throw new HttpError(400, `${key} 必须是有效数字`);
    return String(body[key]);
  };
  let args: Parsed;
  if (path === '/api/task/move') {
    args = { positionals: ['task', 'move', text('id')], values: { lane: text('lane') } };
    if (body.status !== undefined) args.values.status = text('status');
  } else if (path === '/api/task/progress')
    args = { positionals: ['task', 'update', text('id')], values: { progress: number('progress') } };
  else if (path === '/api/req/move')
    args = { positionals: ['req', 'move', text('id')], values: { status: text('status') } };
  else if (path === '/api/req/check') {
    if (typeof body.met !== 'boolean') throw new HttpError(400, '验收勾选值必须是布尔值');
    args = { positionals: ['req', 'check', text('id')], values: { item: number('item'), off: !body.met } };
  } else if (path === '/api/undo') {
    const batch = text('batch');
    if (!batches.has(batch)) throw new HttpError(403, '只能撤销本页面刚才产生的批次');
    args = { positionals: ['undo', batch], values: {} };
  } else throw new HttpError(404, '未找到写接口');
  const result = executeWrite(
    { db, config: { ...cfg, actor: 'web', system: undefined }, at: new Date().toISOString() },
    args,
  );
  if (path === '/api/undo') batches.delete(text('batch'));
  else batches.add(result.batch);
  // A committed write must still return its batch if the optional backup step fails.
  let warning: string | undefined;
  try {
    warning = backup(db, cfg.home, result.text).warning;
  } catch {
    warning = '数据已保存，但 SQL 备份失败，请运行 backup 重试';
  }
  return {
    ok: true,
    batch: result.batch,
    snapshot: transaction(db, () => snapshot(db)),
    ...(warning ? { warning } : {}),
  };
}
