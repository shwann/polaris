import { validateSnapshot } from '@polaris/core';
import type { Database } from '../db/connection.js';
import { integrity } from '../repo/events.js';
import { snapshot } from '../export/snapshot.js';
import { readyForAcceptance } from '../service/reqAutoAccept.js';
export function check(db: Database) {
  const data = snapshot(db),
    issues = validateSnapshot(data),
    checks = integrity(db);
  for (const req of readyForAcceptance(db))
    issues.push({
      level: 'warn',
      path: `requirements/${req.id}`,
      message: '关联任务已全部完成，需求仍未转为待验收，请确认历史状态',
    });
  const errors =
    issues.filter((i) => i.level === 'error').length +
    checks.foreignKeys.length +
    checks.integrity.filter((r) => r.integrity_check !== 'ok').length;
  return {
    tasks: data.tasks.length,
    errors,
    warnings: issues.filter((i) => i.level === 'warn').length,
    issues,
    ...checks,
  };
}
