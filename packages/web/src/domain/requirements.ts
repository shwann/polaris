import { REQ_PRIORITIES, REQ_STATUSES } from '@polaris/core';
import type { Requirement, ReqPriority, ReqStatus, Task } from '@polaris/core';
import { filterSystem, isPlan } from './selectors';

export interface RequirementFilter {
  query: string;
  priority: ReqPriority | '';
  status: ReqStatus | '';
  gapsOnly: boolean;
}

export const filterRequirementSystem = (requirements: Requirement[], key: string) =>
  key === 'all' ? requirements : requirements.filter((r) => r.systemKey === key);

export const acceptanceProgress = (r: Requirement) => ({
  met: r.acceptance.filter((item) => item.met).length,
  total: r.acceptance.length,
});

export function requirementGaps(requirements: Requirement[], tasks: Task[]) {
  return {
    requirements: requirements.filter(
      (r) => ['confirmed', 'scheduled', 'in_progress'].includes(r.status) && !r.taskIds.length,
    ),
    tasks: tasks.filter((t) => t.lane !== 'done' && !t.reqIds.length && !isPlan(t)),
  };
}

export function matchesRequirement(r: Requirement, query: string) {
  const hay = [r.id, r.title, r.body].filter(Boolean).join(' ').toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

export function groupRequirements(requirements: Requirement[]) {
  return REQ_STATUSES.map((status) => ({
    status,
    requirements: requirements
      .filter((r) => r.status === status)
      .sort(
        (a, b) =>
          REQ_PRIORITIES.indexOf(a.priority) - REQ_PRIORITIES.indexOf(b.priority) ||
          Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
          a.id.localeCompare(b.id),
      ),
  }));
}

export const linkedRequirementTasks = (r: Requirement, tasks: Task[]) => tasks.filter((t) => r.taskIds.includes(t.id));

export function requirementsModel(
  requirements: Requirement[],
  tasks: Task[],
  system: string,
  filter: RequirementFilter,
) {
  const own = filterRequirementSystem(requirements, system);
  const ownTasks = filterSystem(tasks, system);
  const gaps = requirementGaps(own, ownTasks);
  const gapIds = new Set(gaps.requirements.map((r) => r.id));
  const shown = own.filter(
    (r) =>
      matchesRequirement(r, filter.query) &&
      (!filter.priority || r.priority === filter.priority) &&
      (!filter.status || r.status === filter.status) &&
      (!filter.gapsOnly || gapIds.has(r.id)),
  );
  return {
    total: own.length,
    shown: shown.length,
    groups: groupRequirements(shown),
    counts: REQ_STATUSES.map((status) => ({ status, count: own.filter((r) => r.status === status).length })),
    p0: own.filter((r) => r.priority === 'P0').length,
    gapCount: gaps.requirements.length + gaps.tasks.length,
    gaps,
  };
}
