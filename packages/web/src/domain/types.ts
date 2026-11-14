import type { AppInfo, Lane, Snapshot, SystemInfo, Task } from '@polaris/core';
export type { Task, Snapshot, SystemInfo, AppInfo, EventItem, Lane } from '@polaris/core';

// Legacy-only prose stays in the adapter; core's public Snapshot remains unchanged.
export interface DisplaySnapshot extends Snapshot {
  presentation?: {
    primaryAppPresent?: boolean;
    note?: string;
    appNote?: string;
    appVersion?: string;
    nextRelease?: string;
  };
}
export interface BoardView {
  tasks: Task[];
  systemKey: string;
  system: SystemInfo;
  systems: SystemInfo[];
  app: AppInfo | null;
  releases: SystemInfo['releases'];
  appVersion: string;
  appNote: string;
  nextRelease: string;
  note: string;
}
export interface LaneInfo {
  key: Lane;
  name: string;
  c: string;
  hint?: string;
  collapsed?: boolean;
}
export interface Filter {
  query: string;
  mineOnly: boolean;
}
export interface Figure {
  label: string;
  tag: string;
  value: string | number;
  notes: string[];
  color: string;
  fraction: number;
  /** Only cards that need attention keep their colour and glow. */
  vivid?: boolean;
}
