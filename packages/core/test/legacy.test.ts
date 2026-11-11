import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromLegacy, validateSnapshot, type LegacyTask } from '../src/index.js';

const SAMPLE = join(import.meta.dirname, '../../../plugin/skills/polaris/assets/sample');
const read = (p: string) => JSON.parse(readFileSync(join(SAMPLE, p), 'utf8'));
const sample = () => ({
  board: read('board.json'),
  log: read('log.json'),
  tasks: readdirSync(join(SAMPLE, 'tasks')).map(
    (f: string) => ({ ...read(`tasks/${f}`), id: f.replace(/\.json$/, '') }) as LegacyTask,
  ),
});
const NOW = '2026-11-11T18:00:00+08:00';

describe('fromLegacy', () => {
  it('turns the sample board into a valid snapshot', () => {
    const s = fromLegacy(sample(), NOW);
    expect(s.systems.map((x) => x.key)).toEqual(['main']);
    expect(s.systems[0]!.app?.version).toBe('1.2');
    expect(s.systems[0]!.releases.map((r) => r.version)).toEqual(['1.1', '1.2']);
    expect(s.tasks).toHaveLength(7);
    expect(validateSnapshot(s).filter((i) => i.level === 'error')).toEqual([]);
  });

  it('maps group to lane, order to sort and empty step states to todo', () => {
    const s = fromLegacy(
      {
        tasks: [
          {
            id: 'A',
            code: 'A',
            title: 't',
            group: 'waiting',
            status: 's',
            order: 3,
            updatedAt: NOW,
            steps: [{ name: 'x', state: '' }],
          },
        ],
      },
      NOW,
    );
    const t = s.tasks[0]!;
    expect([t.lane, t.sort, t.systemKey, t.steps[0]!.state]).toEqual(['waiting', 3, 'main', 'todo']);
  });

  it('gives a task without a system to the first system', () => {
    const s = fromLegacy(
      {
        board: {
          systems: [
            { key: 'beidou', constellation: '北斗', name: 'A' },
            { key: 'ziwei', constellation: '紫微', name: 'B' },
          ],
        },
        tasks: [
          { id: 'A', group: 'doing', updatedAt: NOW },
          { id: 'B', group: 'doing', system: 'ziwei', updatedAt: NOW },
        ],
      },
      NOW,
    );
    expect(s.tasks.map((t) => t.systemKey)).toEqual(['beidou', 'ziwei']);
  });
});

describe('validateSnapshot', () => {
  it('flags unknown systems and dangling requirement links', () => {
    const s = fromLegacy({ tasks: [{ id: 'A', group: 'doing', system: 'nope', reqs: ['R1'], updatedAt: NOW }] }, NOW);
    const msgs = validateSnapshot(s).map((i) => i.message);
    expect(msgs).toContain('systemKey=nope 不在系统清单里');
    expect(msgs).toContain('关联的需求 R1 不存在');
  });
});
