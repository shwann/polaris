import type { WaitingOn } from '@polaris/core';
import type { Point, Triple } from '../../types';

export interface FigureTask {
  id: string;
  waitingOn?: WaitingOn;
  waitingSince?: string;
  updatedAt?: string;
  progress?: number;
  recent?: boolean;
}
export interface FigureNode {
  id: string;
  point: Point;
  slot: string;
  bright: boolean;
  main?: boolean;
  size?: number;
}
export interface FigureEdge {
  a: number;
  b: number;
  bright: boolean;
  alpha?: number;
  /** Quadratic control in the chord's local basis, relative to its midpoint. */
  control?: Point;
  start?: Point;
  /** Optional endpoints on another edge, used by the bowstring's interior stars. */
  end?: [number, number, number];
}
export interface Figure {
  nodes: FigureNode[];
  edges: FigureEdge[];
  spur?: { at: number; from: number; offset: Point };
}
export type Region = Triple;
