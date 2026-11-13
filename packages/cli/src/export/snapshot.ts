import {
  EVENT_LIMIT,
  type Snapshot,
  type Task,
  type Requirement,
  type SystemInfo,
  type EventItem,
} from '@polaris/core';
import type { Database, Row, Value } from '../db/connection.js';
import { systemRows, appRow } from '../repo/systems.js';
import { taskRows, stepRows, reqLinks } from '../repo/tasks.js';
import { requirementRows, acceptanceRows, refRows, taskLinks } from '../repo/requirements.js';
import { releaseRows } from '../repo/releases.js';
import { eventRows } from '../repo/events.js';
import { dispatchModels, dispatchRows, dispatchValue } from '../repo/dispatch.js';

export function camel(row: Row): Record<string, Value> {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => [k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), v]),
  );
}
export function snake(value: object): Row {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]: [string, Value]) => [k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), v]),
  );
}
export function snapshot(db: Database, now = new Date().toISOString()): Snapshot {
  const systems = systemRows(db).map((s) => {
    const app = appRow(db, String(s.key));
    const history = dispatchRows(db, String(s.key), 5).map((r) => dispatchValue(r));
    if (app) delete app.system_key;
    return {
      ...camel(s),
      app: app ? camel(app) : null,
      releases: releaseRows(db, String(s.key)).map(camel),
      ...(history[0] ? { dispatch: { current: history[0], history, models: dispatchModels(db, String(s.key)) } } : {}),
    } as unknown as SystemInfo;
  });
  const tasks = taskRows(db).map(
    (t) =>
      ({
        ...camel(t),
        steps: stepRows(db, String(t.id)).map(camel),
        reqIds: reqLinks(db, String(t.id)).map((r) => String(r.req_id)),
      }) as unknown as Task,
  );
  const requirements = requirementRows(db).map(
    (r) =>
      ({
        ...camel(r),
        acceptance: acceptanceRows(db, String(r.id)).map((a) => ({ text: String(a.text), met: Boolean(a.met) })),
        refs: refRows(db, String(r.id)).map((x) => String(x.ref)),
        taskIds: taskLinks(db, String(r.id)).map((x) => String(x.task_id)),
      }) as unknown as Requirement,
  );
  const events = eventRows(db, EVENT_LIMIT).map((e) => camel(e) as unknown as EventItem);
  const updatedAt = [
    ...tasks.map((t) => t.updatedAt),
    ...requirements.map((r) => r.updatedAt),
    ...events.map((e) => e.at),
    ...systems.flatMap((s) => (s.dispatch ? [s.dispatch.current.setAt] : [])),
  ]
    .sort((a, b) => Date.parse(a) - Date.parse(b))
    .at(-1);
  return { schema: 1, generatedAt: now, ...(updatedAt ? { updatedAt } : {}), systems, tasks, requirements, events };
}
