import { releaseDetails } from './releases.js';
import { EVENT_LIMIT, isLane, isStepState } from './enums.js';
import type { AppInfo, EventItem, Release, Snapshot, SystemInfo, Task, TaskStep } from './types.js';

/**
 * Shapes written before the database existed: the Artifact database (tasks/*, meta/board, meta/log) and the
 * JSON data folder (board.json, log.json, tasks/<id>.json). Both use `group` for the lane and keep the first
 * system's formal build in board.app.
 */
export interface LegacyBoard {
  updatedAt?: string;
  systems?: Array<{ key: string; constellation?: string; name?: string; note?: string; app?: LegacyApp }>;
  app?: LegacyApp;
  appVersion?: string;
  [k: string]: unknown;
}
export type LegacyApp = Partial<AppInfo> & { releases?: Array<{ v: string; at: string; ref?: string; note?: string }> };
export interface LegacyLog {
  items?: Array<{ at: string; text: string }>;
}
export type LegacyTask = Record<string, unknown> & { id: string };

type LegacySystem = NonNullable<LegacyBoard['systems']>[number];
export const DEFAULT_SYSTEM: LegacySystem = { key: 'main', constellation: '北斗', name: '我的系统' };

const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);

function convertApp(app: LegacyApp | undefined, appVersion: string | undefined): [AppInfo | null, Release[]] {
  const releases: Release[] = (app?.releases ?? []).map((r) => ({
    version: r.v,
    releasedAt: r.at,
    ...(r.ref ? { ref: r.ref } : {}),
    ...(r.note ? { note: r.note } : {}),
  }));
  const version = str(app?.version) ?? str(appVersion);
  if (!version) return [null, releases];
  const { releases: _drop, ...rest } = app ?? {};
  return [{ ...rest, version } as AppInfo, releases];
}

function convertSteps(raw: unknown): TaskStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s: { name?: unknown; state?: unknown }) => ({
    name: String(s?.name ?? ''),
    state: isStepState(s?.state) ? s.state : 'todo',
  }));
}

export function convertTask(t: LegacyTask, defaultSystem: string): Task {
  const lane = isLane(t.group) ? t.group : isLane(t.lane) ? t.lane : 'planned';
  const optional = (k: string, from = k) => (str(t[from]) ? { [k]: str(t[from]) } : {});
  const num = (k: string, from = k) => (typeof t[from] === 'number' ? { [k]: t[from] as number } : {});
  return {
    id: t.id,
    systemKey: str(t.system) ?? str(t.systemKey) ?? defaultSystem,
    code: str(t.code) ?? t.id,
    title: str(t.title) ?? t.id,
    lane,
    status: str(t.status) ?? '',
    ...num('sort', 'order'),
    ...num('progress'),
    ...optional('detail'),
    ...optional('needs'),
    ...optional('owner'),
    ...optional('ref'),
    ...optional('waitingSince'),
    ...optional('shippedIn'),
    ...optional('targetRelease'),
    ...optional('unverified'),
    steps: convertSteps(t.steps),
    reqIds: Array.isArray(t.reqs) ? t.reqs.map(String) : [],
    ...optional('createdAt'),
    updatedAt: str(t.updatedAt) ?? new Date(0).toISOString(),
  };
}

/** Convert a pre-database board into a Snapshot. Pure; the CLI importer and the board both use it. */
export function fromLegacy(
  input: { board?: LegacyBoard | null; log?: LegacyLog | null; tasks: LegacyTask[] },
  now: string,
): Snapshot {
  const board = input.board ?? {};
  const listed: LegacySystem[] =
    Array.isArray(board.systems) && board.systems.length ? board.systems : [DEFAULT_SYSTEM];
  const systems: SystemInfo[] = listed.map((s, i) => {
    const [app, releases] = i === 0 ? convertApp(board.app, board.appVersion) : convertApp(s.app, undefined);
    return {
      key: s.key,
      constellation: s.constellation ?? '星座',
      name: s.name ?? s.key,
      ...(s.note ? { note: s.note } : {}),
      sort: i,
      app,
      releases,
    };
  });
  const first = systems[0]!.key;
  const events: EventItem[] = (input.log?.items ?? [])
    .filter((e) => e && typeof e.at === 'string' && typeof e.text === 'string')
    .slice(0, EVENT_LIMIT)
    .map((e) => ({ at: e.at, text: e.text }));
  const tasks = input.tasks.map((t) => convertTask(t, first));
  for (const s of systems)
    s.releases = releaseDetails(
      s.releases,
      tasks.filter((t) => t.systemKey === s.key),
    );
  return {
    schema: 1,
    generatedAt: now,
    ...(str(board.updatedAt) ? { updatedAt: str(board.updatedAt) } : {}),
    systems,
    tasks,
    requirements: [],
    events,
  };
}
