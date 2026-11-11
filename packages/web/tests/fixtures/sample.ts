import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { normalize } from '../../src/data/normalize';
const base = resolve(process.cwd(), 'plugin/skills/polaris/assets/sample') + '/';
const json = (name: string) => JSON.parse(readFileSync(base + name, 'utf8'));
export const legacySample = {
  board: json('board.json'),
  log: json('log.json'),
  tasks: readdirSync(base + 'tasks')
    .filter((p) => p.endsWith('.json'))
    .map((name) => ({ id: name.slice(0, -5), ...json('tasks/' + name) })),
};
export const sample = normalize(legacySample, '2026-11-11T09:00:00+08:00');
