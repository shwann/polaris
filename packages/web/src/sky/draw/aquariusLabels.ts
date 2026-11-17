import { RELEASE_TAG_LABELS } from '@polaris/core';
import { COL_APP } from '../../domain/lanes';
import type { SkyState } from '../types';
import type { Label } from './starLabels';
import { versionCaption } from './releasePaths';

/** Delivered items share the completed-task zoom threshold; overview versions retain their original captions. */
export const aquariusLabelZoom = (s: SkyState) => s.sky && s.cam.s > 2.2 && s.unit * s.cam.s > 640;
const AQUARIUS_LABEL_SIZE = 12;
export const aquariusFontSize = (s: SkyState) => Math.max(AQUARIUS_LABEL_SIZE / s.cam.s, AQUARIUS_LABEL_SIZE * s.sz);
export const itemLabelId = (id: string) => `aquarius-item:${id}`;
export const releaseLabelId = (version: string) => `aquarius-release:${version}`;

/** One queue gives versions, delivered codes and all other task labels a shared collision and memory pass. */
export function aquariusLabels(s: SkyState): Label[] {
  const body = s.aquarius;
  if (!body || !aquariusLabelZoom(s)) return [];
  const size = aquariusFontSize(s),
    visible = ([x, y]: [number, number]) => {
      const [sx, sy] = s.toScreen(x, y);
      return sx >= 8 && sx <= s.w - 8 && sy >= 8 && sy <= s.h - 8;
    },
    points = body.stars.map((n) => s.at(...n.point, 14));
  const labels: Label[] = body.stars.flatMap((n, i) => {
    const p = points[i]!;
    if (!visible(p)) return [];
    const caption = versionCaption(body, points, i, s.sz);
    return [
      {
        id: releaseLabelId(n.release.version),
        lines: [
          n.release.version,
          `${n.release.tag ? RELEASE_TAG_LABELS[n.release.tag] : '发布'} · 交付 ${n.release.items?.length ?? n.release.stats?.items ?? 0} 项`,
        ],
        x: p[0],
        y: caption.point[1],
        gap: Math.abs(caption.point[0] - p[0]) + 6 * s.sz,
        c: COL_APP,
        secondary: COL_APP,
        a: 0.92 * s.skyK,
        pri: 200 + i / body.stars.length,
        size,
        flip: caption.align === 'right',
        preferFull: true,
      },
    ];
  });
  const ordered = [...body.jar.nodes].sort(
    (a, b) => Date.parse(a.release.releasedAt) - Date.parse(b.release.releasedAt),
  );
  for (const [i, n] of ordered.entries()) {
    const p = s.at(...n.point, 14);
    if (!visible(p)) continue;
    const lit = n.release.version === (s.hoverRelease?.release.version || s.selectedRelease);
    labels.push({
      id: itemLabelId(n.id),
      lines: [n.item.code],
      x: p[0],
      y: p[1] - 4 * s.sz,
      gap: 8 * s.sz,
      c: COL_APP,
      a: (lit ? 0.8 : 0.57) * s.skyK,
      pri: 110 + (lit ? 20 : 0) + (n.bright ? 10 : 0) + i / ordered.length,
      size,
    });
  }
  return labels;
}
