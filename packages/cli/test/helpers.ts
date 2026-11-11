import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach } from 'vitest';
import { connect, type Database } from '../src/db/connection.js';
import { config } from '../src/config.js';
import { executeWrite } from '../src/commands/write.js';
import { parse } from '../src/commands/args.js';

const cleanups: Array<() => void> = [];
export function temp() {
  const home = mkdtempSync(join(tmpdir(), 'polaris-cli-test-'));
  cleanups.push(() => rmSync(home, { recursive: true, force: true }));
  return home;
}
export function fixture() {
  const home = temp(),
    path = join(home, 'polaris.db'),
    db = connect(path);
  cleanups.push(() => db.close());
  const cfg = config({ home, actor: 'test' });
  let clock = Date.parse('2026-11-11T00:00:00Z');
  const write = (...args: string[]) => {
    const parsed = parse(args);
    const system = typeof parsed.values.system === 'string' ? parsed.values.system : undefined;
    return executeWrite({ db, config: { ...cfg, system }, at: new Date((clock += 1000)).toISOString() }, parsed);
  };
  return { home, path, db, write };
}
export function boot() {
  const f = fixture();
  f.write('system', 'add', 'beidou', '--name', '北斗');
  return f;
}
export function count(db: Database, table: 'tasks' | 'events' | 'changes') {
  return Number(db.get(`SELECT count(*) AS n FROM ${table}`)!.n);
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});
