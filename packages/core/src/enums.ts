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
  waiting: '等你或客户回复',
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
