import { isIsoTime, isReleaseTag, RELEASE_TAG_LABELS } from '@polaris/core';
import type { Context } from './context.js';
import type { Row } from '../db/connection.js';
import { existing, required } from './context.js';
import { appRow } from '../repo/systems.js';
import { insert, update } from '../repo/rows.js';
import { newId } from '../audit.js';

export function recordRelease(ctx: Context, patch: Row, tasks: string[], note?: string): void {
  const system = required(ctx.config.system, '--system');
  existing(ctx, 'systems', system);
  const version = required(typeof patch.version === 'string' ? patch.version : undefined, '--version');
  const old = appRow(ctx.db, system);
  const { title, tag, ...appPatch } = patch;
  const normalizedTag = releaseTag(tag);
  const app = { ...appPatch, version, rollback: old?.version ?? null, released_at: patch.released_at ?? ctx.at };
  if (!isIsoTime(app.released_at)) throw new Error('--released-at 必须是带时区的 ISO 时间');
  if (old) update(ctx.db, 'system_apps', { system_key: system }, app);
  else insert(ctx.db, 'system_apps', { system_key: system, ...app });
  insert(ctx.db, 'releases', {
    id: newId(),
    system_key: system,
    version,
    released_at: app.released_at,
    ref: patch.ref ?? null,
    note: note ?? null,
    title: title ?? null,
    tag: normalizedTag ?? null,
    build: patch.build ?? null,
  });
  for (const id of tasks) {
    const task = existing(ctx, 'tasks', id);
    if (task.system_key !== system) throw new Error(`任务 ${id} 不属于系统 ${system}`);
    update(ctx.db, 'tasks', { id }, { shipped_in: version, target_release: null, updated_at: ctx.at });
  }
}

function releaseTag(value: Row[string] | undefined) {
  if (value === undefined || value === null || value === '') return value === undefined ? undefined : null;
  const tag = Object.entries(RELEASE_TAG_LABELS).find(([, label]) => label === value)?.[0] ?? value;
  if (!isReleaseTag(tag)) throw new Error('tag 非法，请使用 功能/修复/热修/里程碑 或 feature/fix/hotfix/milestone');
  return tag;
}

/** Edit history without changing which app is currently shipped. */
export function editRelease(ctx: Context, patch: Row, add: string[], remove: string[]): void {
  const system = required(ctx.config.system, '--system');
  existing(ctx, 'systems', system);
  const version = required(typeof patch.version === 'string' ? patch.version : undefined, '--version');
  const release = ctx.db.get('SELECT id FROM releases WHERE system_key=? AND version=?', system, version);
  if (!release) throw new Error(`版本不存在：${version}（系统 ${system}）`);
  const { version: _version, ...fields } = patch;
  if (fields.title === '') fields.title = null;
  if (fields.tag !== undefined) fields.tag = releaseTag(fields.tag) ?? null;
  if (Object.keys(fields).length) update(ctx.db, 'releases', { id: release.id! }, fields);
  for (const id of [...add, ...remove]) {
    const task = existing(ctx, 'tasks', id);
    if (task.system_key !== system) throw new Error(`任务 ${id} 不属于系统 ${system}`);
    if (add.includes(id)) update(ctx.db, 'tasks', { id }, { shipped_in: version, updated_at: ctx.at });
    else if (task.shipped_in === version) update(ctx.db, 'tasks', { id }, { shipped_in: null, updated_at: ctx.at });
  }
}

/** Update release planning without creating a release or changing the shipped app. */
export function setNextRelease(ctx: Context, version: string | undefined, note?: string): void {
  const system = required(ctx.config.system, '--system');
  existing(ctx, 'systems', system);
  const next = required(version, '--version');
  if (!appRow(ctx.db, system)) throw new Error(`系统 ${system} 尚无 App 记录，请先登记正式发版（release record）`);
  update(
    ctx.db,
    'system_apps',
    { system_key: system },
    { next, ...(note !== undefined ? { next_note: note || null } : {}) },
  );
}
