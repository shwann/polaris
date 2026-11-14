import type { Lane } from '../../../domain/types';
import { pisces } from './pisces';
import { sagittarius } from './sagittarius';
import { scorpius } from './scorpius';
import type { FigureTask, Region } from './types';
export type { Figure, FigureEdge, FigureNode, FigureTask } from './types';
export const figureFor = (lane: Lane, tasks: FigureTask[], region: Region) =>
  lane === 'done'
    ? pisces(tasks, region)
    : lane === 'waiting'
      ? scorpius(tasks, region)
      : lane === 'doing'
        ? sagittarius(tasks, region)
        : null;
