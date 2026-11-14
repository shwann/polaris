import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fromLegacy, type LegacyBoard, type LegacyLog, type LegacyTask, type Snapshot } from '@polaris/core';
import type { Database } from '../db/connection.js';
import { insert, rows } from '../repo/rows.js';
import { snake } from './snapshot.js';

export function readLegacy(dir: string, artifact = false, now = new Date().toISOString()): Snapshot {
  const meta = artifact ? join(dir, 'meta') : dir;
  const board = JSON.parse(readFileSync(join(meta, 'board.json'), 'utf8')) as LegacyBoard;
  const log = JSON.parse(readFileSync(join(meta, 'log.json'), 'utf8')) as LegacyLog;
  const tasks = readdirSync(join(dir, 'tasks'))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map(
      (file) =>
        ({
          ...(JSON.parse(readFileSync(join(dir, 'tasks', file), 'utf8')) as Record<string, unknown>),
          id: file.slice(0, -5),
        }) as LegacyTask,
    );
  return fromLegacy({ board, log, tasks }, now);
}
export function importSnapshot(db: Database, data: Snapshot): void {
  if (
    rows(db, 'systems').length ||
    rows(db, 'tasks').length ||
    rows(db, 'requirements').length ||
    rows(db, 'events').length ||
    rows(db, 'changes').length
  )
    throw new Error('只能导入到空库');
  for (const s of data.systems) {
    const { app, releases, ...system } = s;
    insert(db, 'systems', snake(system));
    if (app) insert(db, 'system_apps', { system_key: s.key, ...snake(app) });
    releases.forEach((r, i) =>
      insert(db, 'releases', {
        id: `0000000000000000-import-${s.key}-${String(i).padStart(8, '0')}`,
        system_key: s.key,
        ...snake(Object.fromEntries(Object.entries(r).filter(([key]) => !['items', 'stats'].includes(key)))),
      }),
    );
  }
  for (const req of data.requirements) {
    const { acceptance, refs, taskIds: _taskIds, ...rest } = req;
    insert(db, 'requirements', snake(rest));
    acceptance.forEach((a, seq) =>
      insert(db, 'requirement_acceptance', { req_id: req.id, seq, text: a.text, met: Number(a.met) }),
    );
    refs.forEach((ref, seq) => insert(db, 'requirement_refs', { req_id: req.id, seq, ref }));
  }
  for (const task of data.tasks) {
    const { steps, reqIds, ...rest } = task;
    insert(db, 'tasks', snake(rest));
    steps.forEach((s, seq) => insert(db, 'task_steps', { task_id: task.id, seq, ...snake(s) }));
    for (const req of reqIds) insert(db, 'task_requirements', { task_id: task.id, req_id: req });
  }
  data.events.forEach((e, i) => insert(db, 'events', { id: `import-${String(i).padStart(8, '0')}`, ...snake(e) }));
}
