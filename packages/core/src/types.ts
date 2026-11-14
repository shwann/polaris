import type {
  DispatchEngine,
  DispatchSpec,
  Lane,
  ReqPriority,
  ReqSource,
  ReqStatus,
  StepState,
  WaitingOn,
} from './enums.js';

/** ISO 8601 timestamp with offset, e.g. 2026-11-11T13:30:00+08:00. */
export type IsoTime = string;

/** Stable CLI JSON contract; database row ids are intentionally private. */
export interface DispatchSetting extends DispatchSpec {
  system: string;
  note: string;
  by: string;
  actor: string;
  setAt: IsoTime;
  source: 'system' | 'task';
  task?: string;
}

/** The formal build of a system as its users run it (天枢's panel). */
export interface AppInfo {
  version: string;
  build?: string;
  releasedAt?: IsoTime;
  backend?: string;
  /** What the backend row is called on the board, e.g. API backend. Defaults to 后端. */
  backendLabel?: string;
  backendBuild?: string;
  skill?: string;
  model?: string;
  rollback?: string;
  next?: string;
  nextNote?: string;
  ref?: string;
}

export interface Release {
  version: string;
  releasedAt: IsoTime;
  ref?: string;
  note?: string;
}

/** One system, drawn as one constellation under 北辰. */
export interface SystemInfo {
  key: string;
  constellation: string;
  name: string;
  note?: string;
  sort: number;
  app: AppInfo | null;
  releases: Release[];
  dispatch?: {
    current: DispatchSetting;
    history: DispatchSetting[];
    /** All historical models, including settings outside the recent history window. */
    models?: Partial<Record<DispatchEngine, string[]>>;
  };
}

export interface TaskStep {
  name: string;
  state: StepState;
}

export interface Task {
  id: string;
  systemKey: string;
  code: string;
  title: string;
  lane: Lane;
  status: string;
  sort?: number;
  progress?: number;
  detail?: string;
  /** What the user has to do; the board counts these as “需要你”. */
  needs?: string;
  owner?: string;
  dispatchEngine?: DispatchEngine;
  dispatchModel?: string;
  dispatchEffort?: string;
  executor?: string;
  executorAt?: IsoTime;
  ref?: string;
  /** First time the task entered the waiting lane; kept while it stays there. */
  waitingSince?: IsoTime;
  /** Who the task waits on; absent means 等你 when it is waiting or has `needs`. */
  waitingOn?: WaitingOn;
  shippedIn?: string;
  targetRelease?: string;
  /** Why a shipped task is not yet proven in real use. */
  unverified?: string;
  steps: TaskStep[];
  reqIds: string[];
  createdAt?: IsoTime;
  updatedAt: IsoTime;
}

export interface AcceptanceItem {
  text: string;
  met: boolean;
}

export interface Requirement {
  id: string;
  systemKey: string;
  title: string;
  /** Markdown body. */
  body?: string;
  source: ReqSource;
  priority: ReqPriority;
  status: ReqStatus;
  /** Free scope tag, e.g. “12-31 内” or “范围外需隐藏”. */
  scope?: string;
  owner?: string;
  acceptance: AcceptanceItem[];
  refs: string[];
  taskIds: string[];
  createdAt: IsoTime;
  updatedAt: IsoTime;
}

export interface EventItem {
  at: IsoTime;
  text: string;
  systemKey?: string;
  taskId?: string;
  reqId?: string;
}

/**
 * Everything the board shows, in one document. `polaris serve` answers /data.json with it and
 * `polaris mirror` inlines it into the page; older boards are converted with fromLegacy().
 */
export interface Snapshot {
  schema: 1;
  generatedAt: IsoTime;
  updatedAt?: IsoTime;
  systems: SystemInfo[];
  tasks: Task[];
  requirements: Requirement[];
  /** Newest first, at most EVENT_LIMIT entries. */
  events: EventItem[];
}
