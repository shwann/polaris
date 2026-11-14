import { clusterTitles, skyNames } from './taskNames';
import { COL } from '../domain/lanes';
import { ageText, isOld } from '../domain/time';
import type { Task } from '../domain/types';
import { hash } from './palette';
import type { SkyState, Star } from './types';
export function updateTasks(s: SkyState, list: Task[]) {
  s.unvN = list.filter((t) => t.unverified).length;
  const seen = new Set<string>(),
    names = skyNames(list),
    titles = clusterTitles(list);
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
    star.late = t.lane === 'waiting' && ageText(t)[1];
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
