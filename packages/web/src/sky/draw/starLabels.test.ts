import { describe, expect, it } from 'vitest';
import { FULL_FROM, TITLE_FROM, labelLines, shortLength, wrapTitle } from './starLabels';
import { placeLabel } from './starLabels';

const title = 'UX8 点“查看执行对话”后能用后退回到评审页，并保留抽屉与表单';

describe('star label semantic zoom', () => {
  it('shows only the code below the title zoom, outside the sky view, or without a title', () => {
    expect(labelLines('UX8', title, TITLE_FROM - 0.1, true)).toEqual(['UX8']);
    expect(labelLines('UX8', title, 5, false)).toEqual(['UX8']);
    expect(labelLines('UX8', '  ', 5, true)).toEqual(['UX8']);
  });

  it('adds a clipped title that grows with zoom', () => {
    expect(shortLength(TITLE_FROM)).toBe(4);
    expect(shortLength(FULL_FROM)).toBe(12);
    const a = labelLines('UX8', title, TITLE_FROM, true);
    const b = labelLines('UX8', title, (TITLE_FROM + FULL_FROM) / 2, true);
    expect(a).toEqual(['UX8', title.slice(0, 4) + '…']);
    expect(b[1]!.length).toBeGreaterThan(a[1]!.length);
  });

  it('shows the whole title wrapped at full zoom, at most three lines', () => {
    const lines = labelLines('UX8', title, FULL_FROM, true);
    expect(lines[0]).toBe('UX8');
    expect(lines.slice(1).join('')).toBe(title);
    expect(lines.slice(1).every((l) => l.length <= 16)).toBe(true);
    const long = wrapTitle('字'.repeat(60));
    expect(long).toHaveLength(3);
    expect(long[2]!.endsWith('…')).toBe(true);
  });
});

it('flips right-edge labels to left with right alignment and keeps every vertical bound visible', () => {
  const right = placeLabel(970, 200, 12, 180, 50, [8, 8, 992, 792], 11, 2);
  expect(right.align).toBe('right');
  expect(right.x).toBeLessThan(970);
  const left = placeLabel(30, 200, 12, 180, 50, [8, 8, 992, 792], 11, 2);
  expect(left.align).toBe('left');
  for (const y of [-10, 0, 790, 900]) {
    const p = placeLabel(980, y, 12, 180, 60, [8, 8, 992, 792], 11, 2);
    expect(p.box[0]).toBeGreaterThanOrEqual(8);
    expect(p.box[1]).toBeGreaterThanOrEqual(8);
    expect(p.box[2]).toBeLessThanOrEqual(992);
    expect(p.box[3]).toBeLessThanOrEqual(792);
    expect(p.x).toBe(p.box[2] - 2);
  }
  const long = placeLabel(500, 500, 12, 2000, 50, [8, 8, 992, 792], 11, 2);
  expect(long.box).toEqual([8, 489 - 2, 992, 489 + 52]);
});
