import { DIPPER_LINES } from '../../domain/lanes';
import type { Box, Point, SkyState } from '../types';
import { boundsOf } from './cardPlacement';
import { segmentHitsBox } from './hubSide';
import { swingPeriod } from './spinSpeed';

export const SCORPIUS_SWING_WIDE = 20;
export const SCORPIUS_SWING_TIGHT = 8;
export const SCORPIUS_SWING_PERIOD = swingPeriod(SCORPIUS_SWING_WIDE);
const MAX_ANGLE = (SCORPIUS_SWING_WIDE * Math.PI) / 180;

export function scorpiusSwingDegrees(s: SkyState) {
  if (s.w > 960 && s.ZONE.dip) return SCORPIUS_SWING_WIDE;
  const figure = s.figures.get('waiting'),
    heart = figure?.nodes.find((node) => node.main)?.point;
  if (!figure || !heart || !s.hubLabelBoxes?.length) return SCORPIUS_SWING_TIGHT;

  const [x, y] = s.centre('waiting');
  const [cx, cy] = s.at(x, y, 14);
  const [x0, y0, x1, y1] = boundsOf(
    figure.nodes.flatMap(({ point: [x, y] }) => {
      const dx = x - heart[0],
        dy = y - heart[1];
      return [-MAX_ANGLE, 0, MAX_ANGLE].map((angle): Point => [
        cx + heart[0] + dx * Math.cos(angle) - dy * Math.sin(angle),
        cy + heart[1] + dx * Math.sin(angle) + dy * Math.cos(angle),
      ]);
    }),
  );
  const clearance = 12 * s.sz;
  const sweep: Box = [x0 - clearance, y0 - clearance, x1 + clearance, y1 + clearance];
  const touchesCaption = s.hubLabelBoxes
    .flat()
    .some(([left, top, right, bottom]) => sweep[0] < right && sweep[2] > left && sweep[1] < bottom && sweep[3] > top);
  const touchesLine = [...DIPPER_LINES, [0, 7]].some(([a, b]) => {
    const start = s.dipPos[a!],
      end = s.dipPos[b!];
    return start && end && segmentHitsBox(start, end, sweep);
  });
  return touchesCaption || touchesLine ? SCORPIUS_SWING_TIGHT : SCORPIUS_SWING_WIDE;
}
