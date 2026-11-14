import { LANES } from './lanes';
import { laneTasks, archiveTasks, filtering, searchTasks, lateTasks } from './selectors';
import type { Task, Filter, LaneInfo } from './types';
export interface LaneModel {
  lane: LaneInfo;
  list: Task[];
  recent: Task[];
  older: Task[];
  hint?: string;
  delay: number;
  expanded: boolean;
}
/** `wide` lifts the waiting group into its own full-width row above the two balanced columns. */
export function laneModel(tasks: Task[], filter: Filter, now = Date.now(), wide = false) {
  const shown = searchTasks(tasks, filter),
    active: LaneModel[] = [],
    full: LaneModel[] = [],
    cols: [LaneModel[], LaneModel[]] = [[], []],
    weights = [0, 0];
  let d = 9;
  for (const lane of LANES) {
    const list = laneTasks(shown, lane.key);
    if (!list.length) continue;
    const { recent, older } = lane.key === 'done' ? archiveTasks(list, now) : { recent: list, older: [] };
    let hint = lane.hint;
    if (lane.key === 'waiting') {
      const n = lateTasks(list, now).length;
      hint = n ? `${n} 项已等超过 3 天 · 最久的排最前` : '最久的排最前';
    }
    if (lane.key === 'done') hint = `最近 3 天 ${recent.length} 项`;
    const model = { lane, list, recent, older, hint, delay: d++, expanded: filtering(filter) };
    if (lane.key === 'doing') {
      active.push(model);
      continue;
    }
    if (wide && lane.key === 'waiting') {
      full.push(model);
      continue;
    }
    const side = lane.key === 'waiting' || weights[0]! <= weights[1]! ? 0 : 1;
    cols[side].push(model);
    weights[side]! += lane.collapsed ? 1.5 : list.length + 1.5;
  }
  if (!cols[0].length) cols[0].push(...cols[1].splice(0));
  return { shown: shown.length, total: tasks.length, active, full, cols };
}
