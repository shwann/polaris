import type { Lane } from '../../domain/types';
import type { SkyState } from '../types';

/** Screen pixels around a cluster's stars that still count as "over the cluster". */
export const PAUSE_PAD = 24;

/**
 * Groups that hold still this frame: the one under the pointer (over a star or inside the cluster's extent) and the
 * one whose detail card is open. Holding still means no spin, no pointer pull and no parallax, so a star stays where
 * the reader is aiming.
 */
export function pausedGroups(s: SkyState): Set<Lane> {
  const out = new Set<Lane>();
  if (!s.sky) return out;
  const picked = s.selected ? s.stars.get(s.selected) : undefined;
  if (picked && !picked.dead && (s.w > 560 || picked.group === 'risk' || picked.group === 'release'))
    out.add(picked.group);
  if (s.w <= 560) return out;
  if (s.hover && !s.hover.dead) out.add(s.hover.group);
  if (s.px > -1e3 && s.onSky && !s.drag?.moved) {
    const pad = PAUSE_PAD / s.cam.s,
      boxes = new Map<Lane, [number, number, number, number]>();
    for (const star of s.stars.values()) {
      if (star.dead || star.alpha < 0.02) continue;
      const [x, y] = s.at(star.x, star.y, 14),
        b = boxes.get(star.group);
      if (b) {
        b[0] = Math.min(b[0], x);
        b[1] = Math.min(b[1], y);
        b[2] = Math.max(b[2], x);
        b[3] = Math.max(b[3], y);
      } else boxes.set(star.group, [x, y, x, y]);
    }
    for (const [g, b] of boxes)
      if (s.wpx >= b[0] - pad && s.wpx <= b[2] + pad && s.wpy >= b[1] - pad && s.wpy <= b[3] + pad) out.add(g);
  }
  return out;
}

export const stillPointer = (s: SkyState) => !!s.paused?.size;
