import { measureHubLabels } from './hubLabels';
import type { Box, SkyState } from '../types';

export { textBox } from './hubLabels';
export function hubObstacles(s: SkyState, exclude = -1): Box[] {
  if (!s.sky || s.w <= 560) return [];
  const labels = measureHubLabels(s);
  return s.hubs().flatMap(([x, y], k) => {
    if (k === exclude) return [];
    const r = (k === 7 ? 36 : 18) * s.sz;
    return [[x - r, y - r, x + r, y + r] as Box, ...(labels[k] || [])].map(
      (b) => [...s.toScreen(b[0], b[1]), ...s.toScreen(b[2], b[3])] as Box,
    );
  });
}
