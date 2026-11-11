import { validateSnapshot } from '@polaris/core';
import type { Database } from '../db/connection.js';
import { integrity } from '../repo/events.js';
import { snapshot } from '../export/snapshot.js';
export function check(db: Database) {
  const data = snapshot(db),
    issues = validateSnapshot(data),
    checks = integrity(db);
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
