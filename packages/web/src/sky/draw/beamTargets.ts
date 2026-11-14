import { COL, COL_APP, FIG_LANE } from '../../domain/lanes';
import type { Color, Point, SkyState } from '../types';

export interface BeamEnd {
  id: string;
  point: Point;
  color: Color;
  alpha: number;
  dash: boolean;
}

/** Resolve live positions each frame so elastic drags move both ends of every beam. */
export function beamTargets(s: SkyState): { origin: Point; ends: BeamEnd[]; open: boolean } | null {
  if (!s.sky) return null;
  const body = s.aquarius,
    version = s.beamRelease,
    at = (point: Point) => s.at(...point, 14),
    end = (id: string, point: Point, color = COL_APP, alpha = 1, dash = true): BeamEnd => ({
      id,
      point,
      color,
      alpha,
      dash,
    });
  if (version) {
    const source = body?.stars.find((star) => star.release.version === version);
    return source
      ? {
          origin: at(source.point),
          ends: body!.jar.nodes
            .filter((node) => node.release.version === version)
            .map((node) => end(node.id, at(node.point))),
          open: s.selectedRelease === version,
        }
      : null;
  }
  const sel = s.beamSel,
    origin = s.dipPos[sel];
  if (sel < 0 || !origin) return null;
  const ends =
    sel === 0
      ? (body?.stars ?? []).map((star) => end(star.release.version, at(star.point), COL_APP, star.alpha))
      : sel === 7
        ? s.dipPos.slice(0, 7).map((point, k) => end(String(k), point, k ? COL[FIG_LANE[k]!] : COL_APP))
        : (s.dipIds ?? []).flatMap((item) => {
            const o = typeof item === 'string' ? { id: item, dash: true } : item,
              star = s.stars.get(o.id);
            return star
              ? [end(o.id, at([star.x, star.y]), COL[FIG_LANE[sel]!] || COL.doing, star.alpha, o.dash !== false)]
              : [];
          });
  return { origin, ends, open: s.dipSel === sel };
}
