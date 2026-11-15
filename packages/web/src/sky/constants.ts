import type { Lane } from '../domain/types';
import type { Color, Point, Zone } from './types';
export const WIDE: Zone = {
  dip: true,
  side: [1, 1, 0, -1, -1, 2, 0, -1],
  done: [0.09, 0.6],
  risk: [0.27, 0.42],
  release: [0.43, 0.12],
  waiting: [0.61, 0.6],
  doing: [0.37, 0.83],
  planned: [0.86, 0.85],
  pole: [0.8, 0.07],
  app: [0.74, 0.64],
};
export const TALL: Zone = {
  side: [],
  done: [0.3, 0.14],
  risk: [0.66, 0.28],
  release: [0.28, 0.42],
  waiting: [0.3, 0.63],
  doing: [0.28, 0.86],
  planned: [0.74, 0.86],
  app: [0.74, 0.64],
  pole: [0.8, 0.44],
};
export const SMALL_LABEL: [number, number, CanvasTextAlign][] = [
  [30, 4, 'left'],
  [10, 5, 'left'],
  [-9, 4, 'right'],
  [0, -9, 'center'],
  [0, -9, 'center'],
  [0, -9, 'center'],
  [0, 18, 'center'],
  [24, 5, 'left'],
];
export const NEB: [number, number, Color, number][] = [
  [0.2, 0.75, [120, 90, 255], 13],
  [0.78, 0.3, [40, 200, 255], 17],
  [0.6, 0.82, [255, 90, 140], 21],
];
export const FLOW_ARCS: [Lane, Lane][] = [
  ['planned', 'doing'],
  ['doing', 'waiting'],
  ['doing', 'release'],
  ['doing', 'risk'],
  ['release', 'done'],
  ['risk', 'done'],
  ['waiting', 'doing'],
];
export const LANE_ORDER: Lane[] = ['planned', 'doing', 'waiting', 'release', 'risk', 'done'];
export const anchor = (z: Point, rx: number, ry: number, w: number, h: number): Point => [
  Math.min(Math.max(z[0] * w, rx), w - rx),
  Math.min(Math.max(z[1] * h, ry), h - ry),
];

// Translation parallax; zoom damping is defined in draw/chartGeometry.
export const DEPTH = { dust: 0.35, nebula: 0.6, chart: 0.8, stars: 1 } as const;
export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 8;
