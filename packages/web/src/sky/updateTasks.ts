import { waitingOnOf } from '@polaris/core';
import { clusterTitles, skyNames } from './taskNames';
import { chainsOf } from './geometry/chains';
import { COL } from '../domain/lanes';
import { ageText, isOld } from '../domain/time';
import type { Task } from '../domain/types';
import { hash } from './palette';
import type { SkyState, Star } from './types';
export function updateTasks(s: SkyState, list: Task[], reqTitles: ReadonlyMap<string, string> = new Map()) {
  s.unvN = list.filter((t) => t.unverified).length;
  const seen = new Set<string>(),
    names = skyNames(list),
    titles = clusterTitles(list),
    chains = chainsOf(list, reqTitles);
  let moved = false;
  for (const t of list) {
    seen.add(t.id);
    let star = s.stars.get(t.id);
    if (!star) {
      star = {
        id: t.id,
        group: t.lane,
        ang: hash(t.id, 7) * 6.2832,
        rad: 0.25 + 0.75 * Math.sqrt(hash(t.id, 11)),
        ox: 0,
        oy: 0,
        vx: 0,
        vy: 0,
        alpha: 0,
        flare: 0,
        ph: hash(t.id, 13) * 6.28,
        f: 0.5 + hash(t.id, 17) * 1.4,
        x: NaN,
        y: NaN,
        code: '',
        title: '',
        late: false,
        dead: false,
      } satisfies Star;
      s.stars.set(t.id, star);
      moved = true;
    }
    if (star.group !== t.lane) {
      if (s.booted) {
        star.flare = 1;
        if (t.lane === 'done') s.ripple(star.x, star.y, COL.done, 0.45);
      }
      star.group = t.lane;
      moved = true;
    }
    star.code = t.code;
    star.skyCode = names.get(t.id);
    star.title = t.title;
    star.skyTitle = titles.get(t.id);
    star.recent = t.lane === 'done' && !isOld(t);
    star.wait = t.lane === 'waiting' ? waitingOnOf(t) : undefined;
    const figureTask = {
      id: t.id,
      waitingOn: star.wait,
      waitingSince: t.waitingSince,
      updatedAt: t.updatedAt,
      createdAt: t.createdAt,
      progress: t.progress,
      recent: star.recent,
    };
    const previous = star.figureTask;
    if (
      !previous ||
      previous.waitingOn !== figureTask.waitingOn ||
      previous.waitingSince !== figureTask.waitingSince ||
      previous.updatedAt !== figureTask.updatedAt ||
      previous.createdAt !== figureTask.createdAt ||
      previous.progress !== figureTask.progress ||
      previous.recent !== figureTask.recent
    )
      moved = true;
    star.figureTask = figureTask;
    // Only 等你 throbs when overdue; 等客户 and 等前置 wait on someone else.
    star.late = t.lane === 'waiting' && star.wait === 'user' && ageText(t)[1];
    const chain = chains.get(t.id);
    if (star.chain !== chain?.key) moved = true;
    star.chain = chain?.key;
    star.chainLabel = chain?.label;
    star.dead = false;
  }
  for (const star of s.stars.values())
    if (!seen.has(star.id) && !star.dead) {
      star.dead = true;
      moved = true;
    }
  if (moved) s.rebuild();
  for (const star of s.stars.values()) if (!Number.isFinite(star.x)) [star.x, star.y] = s.home(star, performance.now());
}
