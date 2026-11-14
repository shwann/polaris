import type { LaneInfo, Lane } from './types';
export const LANES: LaneInfo[] = [
  { key: 'doing', name: '开发中', c: '--cyan' },
  { key: 'waiting', name: '等你或客户回复', c: '--coral', hint: '不回复就不会往前走' },
  { key: 'release', name: '已合入、等发版', c: '--amber' },
  { key: 'risk', name: '已知未验证', c: '--violet' },
  { key: 'planned', name: '待开工', c: '--slate', hint: '需求已写好，排队等执行' },
  { key: 'done', name: '已完成', c: '--green', collapsed: true },
];
export const FLOW: Lane[] = ['planned', 'doing', 'waiting', 'release', 'risk', 'done'];
export const FIG_LANE: (Lane | null)[] = [null, ...FLOW];
export const laneInfo = (lane: Lane) => LANES.find((l) => l.key === lane)!;
// J2000 catalogue positions: east left, RA scaled by cos(Dec).
export const DIPPER = [
  { zh: '天枢', gr: 'α', en: 'Dubhe', x: 0.925, y: 0 },
  { zh: '天璇', gr: 'β', en: 'Merak', x: 1, y: 0.215 },
  { zh: '天玑', gr: 'γ', en: 'Phecda', x: 0.724, y: 0.322 },
  { zh: '天权', gr: 'δ', en: 'Megrez', x: 0.592, y: 0.189 },
  { zh: '玉衡', gr: 'ε', en: 'Alioth', x: 0.377, y: 0.232 },
  { zh: '开阳', gr: 'ζ', en: 'Mizar', x: 0.2, y: 0.273 },
  { zh: '摇光', gr: 'η', en: 'Alkaid', x: 0, y: 0.498 },
];
export const DIPPER_LINES: [number, number][] = [
  [6, 5],
  [5, 4],
  [4, 3],
  [3, 2],
  [2, 1],
  [1, 0],
  [0, 3],
];
export type Color = readonly number[];
export const COL: Record<Lane, Color> = {
  doing: [46, 230, 255],
  waiting: [255, 79, 109],
  release: [255, 176, 46],
  risk: [176, 124, 255],
  planned: [140, 160, 195],
  done: [44, 245, 160],
};
export const MAG: Record<Lane, number> = { doing: 3.6, waiting: 3.2, release: 3, risk: 3, planned: 2.4, done: 2.1 };
export const GOLD: Color = [255, 214, 140];
