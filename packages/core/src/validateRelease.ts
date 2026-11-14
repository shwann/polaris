import { isReleaseTag } from './releases.js';
import type { Release } from './types.js';
import { isIsoTime, type Issue } from './validate.js';

export function validateRelease(r: Release, path: string): Issue[] {
  const out: Issue[] = [];
  const err = (message: string) => out.push({ level: 'error', path, message });
  if (typeof r.version !== 'string' || !r.version || !isIsoTime(r.releasedAt)) err('发布版本或发布时间不合法');
  for (const key of ['title', 'build', 'note', 'ref'] as const)
    if (r[key] !== undefined && typeof r[key] !== 'string') err(`${key} 必须是文本`);
  if (r.tag !== undefined && !isReleaseTag(r.tag)) err('tag 非法：功能/修复/热修/里程碑');
  if (r.items !== undefined) {
    if (!Array.isArray(r.items)) err('items 必须是交付项数组');
    else
      for (const item of r.items)
        if (
          !item ||
          ['id', 'code', 'title'].some((key) => typeof item[key as 'id'] !== 'string' || !item[key as 'id']) ||
          !['feature', 'fix'].includes(item.kind)
        )
          err('交付项缺少 id/code/title 或 kind 非法');
  }
  if (r.stats !== undefined) {
    const stats = r.stats;
    if (
      !stats ||
      ['items', 'features', 'fixes', 'unverified'].some((key) => {
        const value = stats[key as 'items'];
        return !Number.isInteger(value) || value < 0;
      })
    )
      err('stats 必须包含非负整数 items/features/fixes/unverified');
    else {
      if (stats.features + stats.fixes !== stats.items || stats.unverified > stats.items) err('发布统计数量不一致');
      if (Array.isArray(r.items) && stats.items !== r.items.length) err('items 与 stats 数量不一致');
      if (stats.rollback !== undefined && typeof stats.rollback !== 'string') err('rollback 必须是版本号');
    }
  }
  return out;
}
