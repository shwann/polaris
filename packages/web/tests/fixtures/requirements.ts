import type { Requirement, Task } from '@polaris/core';
import { sample } from './sample';

export const requirement = (patch: Partial<Requirement> = {}): Requirement => ({
  id: 'R-001',
  systemKey: 'main',
  title: '系统通知',
  body: '**后台通知**\n设置里可以关闭',
  source: 'user',
  priority: 'P1',
  status: 'confirmed',
  scope: '本期',
  acceptance: [
    { text: '后台时才发通知', met: true },
    { text: '可以关闭通知', met: false },
  ],
  refs: ['docs/notifications.md', 'https://example.com/prd'],
  taskIds: [],
  createdAt: '2026-11-10T00:00:00Z',
  updatedAt: '2026-11-11T00:00:00Z',
  ...patch,
});

export const requirementTasks: Task[] = [
  {
    ...sample.tasks[0]!,
    id: 'T-1',
    code: 'NOTICE',
    title: '后台通知任务',
    lane: 'doing',
    status: '实现中',
    progress: 50,
    reqIds: ['R-001'],
  },
  {
    ...sample.tasks[0]!,
    id: 'T-2',
    code: 'SETTINGS',
    title: '设置开关任务',
    lane: 'planned',
    status: '排队中',
    reqIds: [],
  },
  { ...sample.tasks[0]!, id: 'REL-1', code: 'REL120', title: '发版计划', lane: 'planned', reqIds: [] },
];

export const requirementSnapshot = {
  ...sample,
  tasks: requirementTasks,
  requirements: [
    requirement({ taskIds: ['T-1'] }),
    requirement({
      id: 'R-002',
      title: '导出报表',
      body: '导出所有记录',
      priority: 'P0',
      status: 'scheduled',
      source: 'customer',
    }),
    requirement({ id: 'R-003', title: '以后再做', priority: 'P2', status: 'proposed' }),
  ],
};
