import type { Release, Task } from './types.js';

export const RELEASE_TAG_LABELS = { feature: '功能', fix: '修复', hotfix: '热修', milestone: '里程碑' } as const;
export const isReleaseTag = (value: unknown): value is NonNullable<Release['tag']> =>
  typeof value === 'string' && Object.hasOwn(RELEASE_TAG_LABELS, value);
export const releaseKind = (code: string): 'fix' | 'feature' => (/^(FIX|HOTFIX|BUG)/i.test(code) ? 'fix' : 'feature');
export const releaseSummary = (r: Release) =>
  r.title?.trim() ||
  r.note
    ?.trim()
    .split(/[。！？\n]|[.!?](?:\s|$)/)[0]
    ?.trim() ||
  '';

/** The same chronological projection serves live snapshots and older read-only mirrors. */
export function releaseDetails(releases: Release[], tasks: Task[]) {
  return [...releases]
    .sort((a, b) => Date.parse(a.releasedAt) - Date.parse(b.releasedAt) || a.version.localeCompare(b.version))
    .map((r, i, ordered) => {
      const shipped = tasks.filter((t) => t.shippedIn === r.version);
      const items = shipped.map(({ id, code, title }) => ({ id, code, title, kind: releaseKind(code) }));
      const fixes = items.filter((t) => t.kind === 'fix').length;
      return {
        ...r,
        items,
        stats: {
          items: items.length,
          features: items.length - fixes,
          fixes,
          unverified: shipped.filter((t) => !!t.unverified?.trim()).length,
          ...(i ? { rollback: ordered[i - 1]!.version } : {}),
        },
      };
    });
}
