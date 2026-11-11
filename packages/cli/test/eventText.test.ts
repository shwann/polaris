import { expect, test } from 'vitest';
import { describe as describeChange } from '../src/audit.js';

test('activity text shows board names for enum values, but keeps free-text task status as written', () => {
  expect(describeChange('task', 'move', 'A', { lane: 'doing', status: 'done' })).toContain('分组=开发中');
  expect(describeChange('task', 'move', 'A', { lane: 'doing', status: 'done' })).toContain('状态=done');
  expect(describeChange('req', 'add', 'R', { source: 'customer', status: 'confirmed' })).toContain('来源=客户');
  expect(describeChange('req', 'move', 'R', { status: 'confirmed' })).toContain('状态=已确认');
});
