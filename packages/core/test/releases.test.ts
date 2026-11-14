import { expect, it } from 'vitest';
import { releaseSummary } from '../src/releases.js';
import { validateRelease } from '../src/validateRelease.js';
import type { Release } from '../src/types.js';
it('uses the title, then the first sentence without truncating dotted version numbers', () => {
  const r = { version: '.39', releasedAt: '2026-11-12T00:00:00Z', note: '发布 .39 版本。后续说明' };
  expect(releaseSummary(r)).toBe('发布 .39 版本');
  expect(releaseSummary({ ...r, title: ' 单句简介 ' })).toBe('单句简介');
  expect(releaseSummary({ ...r, note: 'First sentence. More detail.' })).toBe('First sentence');
  expect(releaseSummary({ ...r, note: '' })).toBe('');
});
it('accepts older snapshots and validates new metadata, delivery kinds and numeric stats', () => {
  const r = { version: '.39', releasedAt: '2026-11-12T00:00:00Z' };
  expect(validateRelease(r, 'release')).toEqual([]);
  for (const fields of [
    { tag: 'other' },
    { build: 1 },
    { items: [{ id: 'a', kind: 'bug' }] },
    { stats: { items: 2, features: 1, fixes: 0, unverified: 0 } },
    { stats: { items: -1, features: 0, fixes: 0, unverified: 0 } },
  ])
    expect(validateRelease({ ...r, ...fields } as Release, 'release').length).toBeGreaterThan(0);
});
