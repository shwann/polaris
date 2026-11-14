import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from '../testFixture';
import { FIG_LANE, LANES } from '../../domain/lanes';
import { hubCaption } from '../geometry/hubLabels';
import { drawHubLabels, paintHubLabels } from './labels';
import { intersects, labelObstacles } from './labelObstacles';
import { drawStarLabels } from './starLabels';
import type { Box } from '../types';

const hubAt = (s: ReturnType<typeof fixture>['s'], k: number, x: number, y: number) => {
  s.dipPos = Array.from({ length: 8 }, (_, i) => [i === k ? x : -5000 - i * 300, i === k ? y : -5000]);
};

it('writes every Dipper caption as one Chinese line: Greek letter, star, group name and count', () => {
  const { s, star, registry } = fixture();
  for (const [i, lane] of LANES.entries()) {
    for (let n = 0; n <= i; n++) star(`${lane.key}-${n}`, n, n, lane.key);
    s.counts.set(lane.key, i + 1);
  }
  for (let k = 1; k <= 6; k++) {
    const g = FIG_LANE[k]!,
      { l1 } = hubCaption(s, k);
    expect(l1).toBe(
      `${'αβγδεζη'[k]} ${['', '天璇', '天玑', '天权', '玉衡', '开阳', '摇光'][k]} · ${LANES.find((l) => l.key === g)!.name} ${s.counts.get(g)}`,
    );
    expect(l1).not.toMatch(/[A-Z]{3,}/);
  }
  expect(hubCaption(s, 3).l1).toBe('δ 天权 · 等你或客户回复 2');
  s.board = { app: null, appVersion: '.39', nextRelease: '.40：待实证' };
  s.unvN = 24;
  expect(hubCaption(s, 0)).toMatchObject({ l1: 'α 天枢 · 正式 App .39', l2: '下个 .40 · 待实证 24' });
  expect(hubCaption(s, 7)).toMatchObject({ l1: '北辰 · 全部 21 · 完成 29%', l2: '' });
  registry.dispose();
});

it('keeps the zoom-out hint as a second line only while there is room for it', () => {
  const { s, star, registry } = fixture();
  for (let i = 0; i < 20; i++) star(`d${i}`, i, i, 'done');
  s.counts.set('done', 20);
  hubAt(s, 6, 400, 300);
  drawHubLabels(s);
  expect(s.hubLabelBoxes![6]).toHaveLength(2);
  // A bright star right under the hint: the hint gives way, the caption stays.
  const [, hint] = s.hubLabelBoxes![6]!;
  star('crowd', (hint![0] + hint![2]) / 2, (hint![1] + hint![3]) / 2, 'waiting');
  drawHubLabels(s);
  expect(s.hubLabelBoxes![6]).toHaveLength(1);
  registry.dispose();
});

it.each([1, 2.4, 5])('never lets a task label overlap a Dipper caption at zoom %s', (zoom) => {
  const { s, star, registry } = fixture();
  s.cam.s = zoom;
  s.sz = zoom ** -0.6;
  s.counts.set('release', 9);
  hubAt(s, 4, 500, 300);
  drawHubLabels(s);
  const caption = s.hubLabelBoxes![4]![0]!;
  // A star sitting right against the caption's right edge, the way RISK-DRIFT met ε 玉衡.
  const own = star('RISK-DRIFT', caption[2] + 4, (caption[1] + caption[3]) / 2, 'risk');
  const placed = drawStarLabels(s, [
    { id: own.id, x: own.x, y: own.y, gap: 9 * s.sz, lines: ['RISK-DRIFT'], a: 1, c: [255, 255, 255], pri: 3 },
  ]);
  for (const box of placed) expect(intersects(box, caption)).toBe(false);
  expect(labelObstacles(s).boxes.some((b: Box) => b[0] <= caption[0] && b[2] >= caption[2])).toBe(true);
  registry.dispose();
});

it('hides a task label that has no free side next to a caption instead of covering it', () => {
  const { s, star, registry } = fixture();
  s.counts.set('waiting', 19);
  hubAt(s, 3, 500, 300);
  drawHubLabels(s);
  const [x0, y0, x1, y1] = s.hubLabelBoxes![3]![0]!;
  const own = star('AIX4', (x0 + x1) / 2, (y0 + y1) / 2, 'waiting');
  const placed = drawStarLabels(s, [
    { id: own.id, x: own.x, y: own.y, gap: 2, lines: ['AIX4'], a: 1, c: [255, 255, 255], pri: 3 },
  ]);
  for (const box of placed) expect(intersects(box, [x0, y0, x1, y1])).toBe(false);
  registry.dispose();
});

it('paints Dipper captions after the task stars in the wide sky view', () => {
  const { s, star, registry } = fixture(),
    order: string[] = [];
  s.ctx.fillText = vi.fn((text: string) => order.push(text));
  s.ctx.drawImage = vi.fn(() => order.push('halo'));
  star('AIX4', 400, 300, 'waiting');
  s.counts.set('waiting', 1);
  hubAt(s, 3, 400, 300);
  drawHubLabels(s);
  expect(order).not.toContain('δ 天权 · 等你或客户回复 1');
  s.drawStars(0, [...s.stars.values()]);
  paintHubLabels(s);
  expect(order.lastIndexOf('δ 天权 · 等你或客户回复 1')).toBeGreaterThan(order.lastIndexOf('halo'));
  registry.dispose();
});
