import { LANE_LABELS, REQ_SOURCE_LABELS, REQ_STATUS_LABELS, WAITING_ON_LABELS } from '@polaris/core';
import type { Database, Row } from './db/connection.js';
import { businessTables, identity, insert, rows, type Table } from './repo/rows.js';

let sequence = 0;
export const newId = () =>
  `${Date.now().toString().padStart(16, '0')}-${process.pid.toString().padStart(8, '0')}-${(sequence++).toString().padStart(8, '0')}`;
export type State = Map<Table, Map<string, Row>>;
export function capture(db: Database): State {
  return new Map(
    businessTables.map((table) => [
      table,
      new Map(rows(db, table).map((r) => [JSON.stringify(identity(table, r)), r])),
    ]),
  );
}
export function audit(db: Database, before: State, batch: string, actor: string, at: string): void {
  const after = capture(db);
  for (const table of businessTables) {
    const oldRows = before.get(table)!;
    const newRows = after.get(table)!;
    for (const key of new Set([...oldRows.keys(), ...newRows.keys()])) {
      const old = oldRows.get(key),
        next = newRows.get(key);
      for (const field of new Set([...Object.keys(old ?? {}), ...Object.keys(next ?? {})])) {
        const a = old?.[field] ?? null,
          b = next?.[field] ?? null;
        if (old && next && a === b) continue;
        insert(db, 'changes', {
          id: newId(),
          at,
          actor,
          op: !old ? 'insert' : !next ? 'delete' : 'update',
          entity: table,
          entity_id: key,
          field,
          old: JSON.stringify(a),
          new: JSON.stringify(b),
          batch,
        });
      }
    }
  }
}

const verbs: Record<string, string> = {
  add: '新增',
  update: '更新',
  move: '移动',
  step: '设置步骤',
  link: '关联',
  unlink: '取消关联',
  delete: '删除',
};
const fieldLabels: Record<string, string> = {
  code: '编号',
  title: '标题',
  lane: '分组',
  status: '状态',
  sort: '排序',
  progress: '进度',
  detail: '详情',
  needs: '需要你',
  waiting_on: '等谁',
  owner: '负责人',
  executor: '执行',
  executor_at: '执行记录时间',
  dispatch_engine: '派工引擎',
  dispatch_model: '派工模型',
  dispatch_effort: '派工思考',
  ref: '引用',
  shipped_in: '交付版本',
  target_release: '目标版本',
  unverified: '未验证',
  body: '正文',
  source: '来源',
  priority: '优先级',
  scope: '范围',
  constellation: '星座',
  name: '名称',
  note: '说明',
  state: '步骤状态',
  seq: '步骤编号',
  task: '任务',
  req: '需求',
  accept: '验收标准',
  refs: '文档',
};
// Stored enum values (doing, customer…) read as their board names in activity text.
const valueLabels: Record<string, Record<string, string>> = {
  lane: LANE_LABELS,
  waiting_on: WAITING_ON_LABELS,
  source: REQ_SOURCE_LABELS,
  status: REQ_STATUS_LABELS,
  state: { todo: '待做', doing: '进行中', blocked: '受阻', done: '完成' },
};
// Task status is free text; only a requirement's status is an enum.
const valueLabel = (entity: string, key: string, value: unknown) =>
  (key === 'status' && entity !== 'req' ? undefined : valueLabels[key]?.[String(value)]) ?? String(value);
export function describe(entity: 'task' | 'req' | 'system', action: string, id: string, fields: Row): string {
  const name = { task: '任务', req: '需求', system: '系统' }[entity];
  const detail = Object.entries(fields)
    .map(
      ([k, v]) =>
        `${fieldLabels[k] || k}=${v === null ? '清空' : valueLabel(entity, k, v).replace(/\s+/g, ' ').slice(0, 80)}`,
    )
    .join('，');
  return `${verbs[action] || action}${name} ${id}${detail ? `：${detail}` : ''}`;
}
export const releaseText = (system: string, version: string, tasks: string[], fields?: Row, remove: string[] = []) =>
  `${fields ? '编辑' : '登记'}系统 ${system} 发版 ${version}${tasks.length ? `，交付任务 ${tasks.join('、')}` : ''}${remove.length ? `，移除任务 ${remove.join('、')}` : ''}${
    fields
      ? `，${Object.entries(fields)
          .filter(([key]) => key !== 'version')
          .map(([key, value]) => `${{ tag: '标签', build: '构建号', ...fieldLabels }[key] || key}=${value ?? '清空'}`)
          .join('，')}`
      : ''
  }`;
export const importText = (tasks: number, events: number) => `导入 ${tasks} 项任务和 ${events} 条动态`;
export const undoText = (batch: string) => `撤销批次 ${batch}`;
export function recordEvent(db: Database, at: string, text: string, system?: string): void {
  insert(db, 'events', { id: newId(), at, text, system_key: system ?? null });
}
