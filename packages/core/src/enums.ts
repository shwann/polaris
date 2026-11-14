/**
 * Closed value sets shared by the CLI (database CHECK constraints, validation) and the board (labels, colours).
 * Keys are stable English identifiers stored in data; labels are what people read.
 */

/** Task lanes: the six task groups, one per Big Dipper star besides 天枢. */
export const LANES = ['planned', 'doing', 'waiting', 'release', 'risk', 'done'] as const;
export type Lane = (typeof LANES)[number];

export const LANE_LABELS: Record<Lane, string> = {
  planned: '待开工',
  doing: '开发中',
  waiting: '等待中',
  release: '已合入、等发版',
  risk: '已知未验证',
  done: '已完成',
};

/** Order a task normally moves through; used for sorting and the matrix. */
export const LANE_FLOW: readonly Lane[] = ['planned', 'doing', 'waiting', 'release', 'risk', 'done'];

export const STEP_STATES = ['todo', 'doing', 'blocked', 'done'] as const;
export type StepState = (typeof STEP_STATES)[number];

export const REQ_STATUSES = [
  'proposed',
  'clarifying',
  'confirmed',
  'scheduled',
  'in_progress',
  'acceptance',
  'done',
  'shelved',
] as const;
export type ReqStatus = (typeof REQ_STATUSES)[number];

export const REQ_STATUS_LABELS: Record<ReqStatus, string> = {
  proposed: '提出',
  clarifying: '待澄清',
  confirmed: '已确认',
  scheduled: '已排期',
  in_progress: '开发中',
  acceptance: '待验收',
  done: '已完成',
  shelved: '搁置',
};

export const REQ_PRIORITIES = ['P0', 'P1', 'P2'] as const;
export type ReqPriority = (typeof REQ_PRIORITIES)[number];

export const REQ_SOURCES = ['customer', 'user', 'review', 'defect'] as const;
export type ReqSource = (typeof REQ_SOURCES)[number];

export const REQ_SOURCE_LABELS: Record<ReqSource, string> = {
  customer: '客户',
  user: '用户',
  review: '评审',
  defect: '缺陷',
};

/** Who a waiting task is blocked on; NULL on a waiting task (or one with `needs`) means the user. */
export const WAITING_ON = ['user', 'customer', 'dependency'] as const;
export type WaitingOn = (typeof WAITING_ON)[number];
export const WAITING_ON_LABELS: Record<WaitingOn, string> = { user: '等你', customer: '等客户', dependency: '等前置' };
export const isWaitingOn = (v: unknown): v is WaitingOn =>
  typeof v === 'string' && (WAITING_ON as readonly string[]).includes(v);
const WAITING_ON_ALIASES: Record<string, WaitingOn> = { 你: 'user', 客户: 'customer', 前置: 'dependency' };
/** Reads a CLI value: English key, short Chinese (你/客户/前置) or label (等你…); '' clears. */
export function parseWaitingOn(input: string): WaitingOn | null {
  const v = input.trim();
  if (!v) return null;
  if (isWaitingOn(v)) return v;
  const found =
    WAITING_ON_ALIASES[v] ?? (Object.entries(WAITING_ON_LABELS).find(([, label]) => label === v)?.[0] as WaitingOn);
  if (!found) throw new Error(`等谁只能是 你|客户|前置（或 user|customer|dependency），收到：${v}`);
  return found;
}
/** Effective category: an explicit value, else 等你 for a waiting task or one with `needs`, else none. */
export function waitingOnOf(t: {
  lane: string;
  needs?: string | null;
  waitingOn?: string | null;
}): WaitingOn | undefined {
  if (t.lane !== 'waiting' && !t.needs?.trim()) return undefined;
  return isWaitingOn(t.waitingOn) ? t.waitingOn : 'user';
}

/** A waiting task older than this many days is flagged on the board. */
export const LATE_DAYS = 3;

/** How many activity entries the board keeps showing. */
export const EVENT_LIMIT = 40;

export const isLane = (v: unknown): v is Lane => typeof v === 'string' && (LANES as readonly string[]).includes(v);
export const isStepState = (v: unknown): v is StepState =>
  typeof v === 'string' && (STEP_STATES as readonly string[]).includes(v);
export const isReqStatus = (v: unknown): v is ReqStatus =>
  typeof v === 'string' && (REQ_STATUSES as readonly string[]).includes(v);
export const isReqPriority = (v: unknown): v is ReqPriority =>
  typeof v === 'string' && (REQ_PRIORITIES as readonly string[]).includes(v);
export const isReqSource = (v: unknown): v is ReqSource =>
  typeof v === 'string' && (REQ_SOURCES as readonly string[]).includes(v);

export const DISPATCH_EFFORTS = {
  codex: ['minimal', 'low', 'medium', 'high', 'xhigh'],
  claude: ['low', 'medium', 'high', 'xhigh', 'max'],
} as const;
export type DispatchEngine = keyof typeof DISPATCH_EFFORTS;
export interface DispatchSpec {
  engine: DispatchEngine;
  model: string;
  effort: string;
}
export const DISPATCH_ENGINE_LABELS: Record<DispatchEngine, string> = { codex: 'Codex', claude: 'Claude' };
export const DISPATCH_EFFORT_LABELS: Record<(typeof DISPATCH_EFFORTS)[DispatchEngine][number], string> = {
  minimal: '最低',
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '极高',
  max: '最大',
};

/** Shared validation for system settings, task overrides and snapshots. */
export function dispatchError(engine: unknown, model: unknown, effort: unknown): string | undefined {
  if (engine !== 'codex' && engine !== 'claude') return '派工 engine 只能是 codex 或 claude';
  if (typeof model !== 'string' || !model.trim()) return '派工 model 必须非空';
  if (typeof effort !== 'string' || !(DISPATCH_EFFORTS[engine] as readonly string[]).includes(effort))
    return `派工 ${engine} 的 effort 只能是 ${DISPATCH_EFFORTS[engine].join('|')}`;
  return undefined;
}
