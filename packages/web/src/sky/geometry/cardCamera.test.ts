import '../../../tests/support';
import { expect, it } from 'vitest';
import { fixture } from '../testFixture';
import { placeCard, type CardSide } from './cardPlacement';

it('smoothly brings an offscreen selection and its detail card into the desktop viewport', () => {
  let side: CardSide | undefined;
  let card: ReturnType<typeof placeCard> | undefined;
  const { s, star, registry } = fixture(false, {
    onSelectedMove: (x, y, cluster) => {
      card = placeCard([x, y], cluster!, [330, 220], [1000, 726], side);
      side = card.side;
      return card.pan;
    },
  });
  const selected = star('a', 950, 400);
  star('b', 990, 450);
  s.selected = selected.id;
  Object.assign(s.cam, { s: 2, x: -500, y: -100 });
  Object.assign(s.camT, s.cam);
  s.frame(16);
  expect(s.cam.x).toBe(-500);
  expect(s.camT.x).toBeLessThan(-500);
  for (let time = 32; time < 1800; time += 16) s.frame(time);
  const [x, y] = s.toScreen(selected.x, selected.y);
  expect(x).toBeGreaterThan(16);
  expect(x).toBeLessThan(984);
  expect(y).toBeGreaterThan(16);
  expect(y).toBeLessThan(710);
  expect(card!.left).toBeGreaterThanOrEqual(16);
  expect(card!.left + 330).toBeLessThanOrEqual(984);
  expect(x < card!.left || x > card!.left + 330 || y < card!.top || y > card!.top + 220).toBe(true);
  expect(Math.hypot(...card!.pan)).toBeLessThan(1);
  registry.dispose();
});
