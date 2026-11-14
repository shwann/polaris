import { COL_APP } from '../../domain/lanes';
import { boundsOf } from '../geometry/cardPlacement';
import { clearTooltip } from '../tooltip';
import type { SkyState } from '../types';
import { rgba } from '../palette';

/** Follow the selected Aquarius anchor with the existing task-card placement and camera clearance. */
export function moveAquariusCard(s: SkyState, t: number) {
  if (!s.sky || (!s.selectedRelease && !s.deliveryVersion)) return;
  const body = s.aquarius;
  const node = s.selectedRelease
    ? body?.stars.find((n) => n.release.version === s.selectedRelease)
    : body?.jar.nodes.find((n) => n.id === s.selected);
  if (!node) {
    s.selected = s.selectedRelease = s.deliveryVersion = null;
    s.events.onPickStar?.(null);
    return;
  }
  const point = s.toScreen(...s.at(...node.point, 14));
  s.ctx.strokeStyle = rgba(COL_APP, 0.9);
  s.ctx.lineWidth = 1.2;
  s.ctx.beginPath();
  s.ctx.arc(...point, 14 + Math.sin(t / 260) * 2, 0, Math.PI * 2);
  s.ctx.stroke();
  const peers = s.deliveryVersion ? body!.jar.nodes.filter((n) => n.release.version === s.deliveryVersion) : [node];
  const box = boundsOf(peers.map((n) => s.toScreen(...s.at(...n.point, 14))));
  const pan = s.api.onSelectedMove(...point, box);
  if (pan && s.w > 560 && !s.drag && Math.hypot(...pan) > 0.75) {
    clearTooltip(s);
    s.camT.x = s.cam.x + pan[0];
    s.camT.y = s.cam.y + pan[1];
  }
}
