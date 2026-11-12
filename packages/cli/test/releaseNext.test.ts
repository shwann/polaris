import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, expect, test } from 'vitest';
import { connect } from '../src/db/connection.js';
import { temp } from './helpers.js';

const binary = resolve('plugin/bin/polaris.mjs');
beforeAll(() => {
  execFileSync(process.execPath, [resolve('packages/cli/scripts/bundle.mjs')]);
});
function cli(home: string, ...args: string[]) {
  return JSON.parse(
    execFileSync(process.execPath, [binary, ...args, '--home', home, '--json'], { encoding: 'utf8', stdio: 'pipe' }),
  );
}

test('release next changes only planning fields, records audit/activity/backup, preserves an omitted note and supports undo', () => {
  const home = temp();
  cli(home, 'system', 'add', 'test');
  cli(
    home,
    'release',
    'record',
    '--system',
    'test',
    '--version',
    '.36',
    '--next',
    '.37',
    '--next-note',
    '旧说明',
    '--build',
    'old-build',
  );
  cli(home, 'system', 'add', 'other');
  cli(home, 'release', 'record', '--system', 'other', '--version', '1');
  const before = cli(home, 'system', 'list');
  const changed = cli(home, 'release', 'next', '--system', 'test', '--version', '.39', '--note', '跳过已回退版本');
  const after = cli(home, 'system', 'list');
  expect(after).toEqual(
    before.map((s: { key: string; app: object }) =>
      s.key === 'test' ? { ...s, app: { ...s.app, next: '.39', nextNote: '跳过已回退版本' } } : s,
    ),
  );
  const db = connect(join(home, 'polaris.db'));
  try {
    expect(
      db.all('SELECT field FROM changes WHERE batch=? AND entity=? ORDER BY field', changed.batch, 'system_apps'),
    ).toEqual([{ field: 'next' }, { field: 'next_note' }]);
    expect(db.get('SELECT text FROM events ORDER BY id DESC LIMIT 1')!.text).toBe(changed.text);
    expect(changed.text).toContain('下一版 .39');
  } finally {
    db.close();
  }
  expect(readFileSync(changed.backup.file, 'utf8')).toContain('.39');
  cli(home, 'release', 'next', '--system', 'test', '--version', '.40');
  expect(cli(home, 'system', 'list').find((s: { key: string }) => s.key === 'test').app.nextNote).toBe(
    '跳过已回退版本',
  );
  const cleared = cli(home, 'release', 'next', '--system', 'test', '--version', '.39', '--note', '');
  expect(cli(home, 'system', 'list').find((s: { key: string }) => s.key === 'test').app.nextNote).toBeUndefined();
  cli(home, 'undo', cleared.batch);
  expect(cli(home, 'system', 'list').find((s: { key: string }) => s.key === 'test').app).toMatchObject({
    next: '.40',
    nextNote: '跳过已回退版本',
  });
  const reverted = cli(home, 'release', 'next', '--system', 'test', '--version', '.41', '--note', '临时');
  cli(home, 'undo', reverted.batch);
  expect(cli(home, 'system', 'list').find((s: { key: string }) => s.key === 'test').app).toMatchObject({
    next: '.40',
    nextNote: '跳过已回退版本',
  });
  expect(cli(home, '--help').help).toContain('release next --version VERSION [--note TEXT]');
});
test('release next rejects missing system, app or version without writing data', () => {
  const home = temp();
  cli(home, 'system', 'add', 'empty');
  const db = connect(join(home, 'polaris.db'));
  const events = () => db.get('SELECT count(*) AS n FROM events')!.n;
  try {
    const before = events();
    expect(() => cli(home, 'release', 'next', '--system', 'empty', '--version', '.39')).toThrow(/尚无 App 记录/);
    expect(() => cli(home, 'release', 'next', '--system', 'empty')).toThrow(/--version/);
    expect(() => cli(home, 'release', 'next', '--system', 'missing', '--version', '.39')).toThrow(/找不到 systems/);
    expect(events()).toBe(before);
    expect(db.all('SELECT * FROM system_apps')).toEqual([]);
    expect(db.all('SELECT * FROM releases')).toEqual([]);
  } finally {
    db.close();
  }
});
