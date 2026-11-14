import { parseArgs } from 'node:util';
import { REQ_SOURCE_LABELS, REQ_STATUS_LABELS } from '@polaris/core';
import type { Row } from '../db/connection.js';

const strings = [
  'home',
  'actor',
  'system',
  'id',
  'code',
  'title',
  'lane',
  'status',
  'sort',
  'progress',
  'detail',
  'needs',
  'owner',
  'ref',
  'shipped-in',
  'target-release',
  'unverified',
  'body',
  'source',
  'priority',
  'scope',
  'constellation',
  'name',
  'req',
  'task',
  'seq',
  'item',
  'state',
  'version',
  'tag',
  'build',
  'released-at',
  'backend',
  'backend-label',
  'backend-build',
  'skill',
  'model',
  'next',
  'next-note',
  'port',
  'out',
  'text',
  'note',
  'engine',
  'effort',
  'by',
  'dispatch',
  'executor',
  'waiting-on',
];
const options = Object.fromEntries(strings.map((s) => [s, { type: 'string' as const }]));
export interface Parsed {
  values: Record<string, string | boolean | string[] | undefined>;
  positionals: string[];
}
export function parse(args: string[]): Parsed {
  return parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: {
      ...options,
      json: { type: 'boolean' },
      history: { type: 'boolean' },
      off: { type: 'boolean' },
      readonly: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      'artifact-export': { type: 'boolean' },
      accept: { type: 'string', multiple: true },
      refs: { type: 'string', multiple: true },
      tasks: { type: 'string', multiple: true },
      'add-tasks': { type: 'string', multiple: true },
      'remove-tasks': { type: 'string', multiple: true },
    },
  });
}

export function string(args: Parsed, key: string): string | undefined {
  const value = args.values[key];
  return typeof value === 'string' ? value : undefined;
}
export function multi(args: Parsed, key: string): string[] | undefined {
  const value = args.values[key];
  return Array.isArray(value) ? value : undefined;
}
export function patch(args: Parsed, fields: readonly string[]): Row {
  const result: Row = {};
  for (const field of fields) {
    let v: string | number | null | undefined = string(args, field);
    if (v === undefined) continue;
    if (field === 'source') v = Object.entries(REQ_SOURCE_LABELS).find(([, label]) => label === v)?.[0] ?? v;
    if (field === 'status') v = Object.entries(REQ_STATUS_LABELS).find(([, label]) => label === v)?.[0] ?? v;
    if (['sort', 'progress'].includes(field)) {
      v = Number(v);
      if (!Number.isFinite(v)) throw new Error(`--${field} 必须是有效数字`);
    } else if (v === '' && !['title', 'name', 'status', 'code', 'version'].includes(field)) v = null;
    result[field.replaceAll('-', '_')] = v;
  }
  return result;
}
