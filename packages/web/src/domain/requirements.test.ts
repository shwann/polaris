import { describe, expect, it } from 'vitest';
import {
  acceptanceProgress,
  filterRequirementSystem,
  groupRequirements,
  linkedRequirementTasks,
  matchesRequirement,
  requirementGaps,
  requirementsModel,
} from './requirements';
import { requirement, requirementSnapshot, requirementTasks } from '../../tests/fixtures/requirements';

const filter = { query: '', priority: '', status: '', gapsOnly: false } as const;

describe('requirement domain', () => {
  it('keeps all eight groups and sorts priority then actual update time without mutating input', () => {
    const rows = [
      requirement({ id: 'old', priority: 'P1', updatedAt: '2026-11-11T08:30:00+08:00' }),
      requirement({ id: 'low', priority: 'P2' }),
      requirement({ id: 'new', priority: 'P1', updatedAt: '2026-11-11T01:00:00Z' }),
      requirement({ id: 'high', priority: 'P0', updatedAt: '2026-11-10T00:00:00Z' }),
    ];
    const before = rows.map((r) => r.id);
    const groups = groupRequirements(rows);
    expect(groups.map((g) => g.status)).toEqual([
      'proposed',
      'clarifying',
      'confirmed',
      'scheduled',
      'in_progress',
      'acceptance',
      'done',
      'shelved',
    ]);
    expect(groups[2]!.requirements.map((r) => r.id)).toEqual(['high', 'new', 'old', 'low']);
    expect(rows.map((r) => r.id)).toEqual(before);
  });

  it('finds exactly the three actionable unlinked requirement states and unfinished unlinked tasks, except REL plans', () => {
    const rows = groupRequirements([]).map(({ status }) => requirement({ id: status, status }));
    const linked = requirement({ taskIds: ['T-1'] });
    const gaps = requirementGaps(
      [...rows, linked],
      [
        ...requirementTasks,
        { ...requirementTasks[1]!, id: 'DONE', lane: 'done' },
        { ...requirementTasks[1]!, id: 'WAIT', lane: 'waiting' },
        { ...requirementTasks[1]!, id: 'RISK', lane: 'risk' },
        { ...requirementTasks[1]!, id: 'SHIP', lane: 'release' },
        { ...requirementTasks[1]!, id: 'MIDDLE', code: 'XREL' },
      ],
    );
    expect(gaps.requirements.map((r) => r.id)).toEqual(['confirmed', 'scheduled', 'in_progress']);
    expect(gaps.tasks.map((t) => t.id)).toEqual(['T-2', 'WAIT', 'RISK', 'SHIP', 'MIDDLE']);
  });

  it('computes acceptance counts, including empty criteria, and resolves related tasks', () => {
    expect(acceptanceProgress(requirement())).toEqual({ met: 1, total: 2 });
    expect(acceptanceProgress(requirement({ acceptance: [] }))).toEqual({ met: 0, total: 0 });
    expect(linkedRequirementTasks(requirement({ taskIds: ['T-1'] }), requirementTasks)).toEqual([requirementTasks[0]]);
  });

  it('searches ID, title and body case-insensitively with all words required', () => {
    expect(matchesRequirement(requirement(), 'r-001 通知 后台')).toBe(true);
    expect(matchesRequirement(requirement(), '设置')).toBe(true);
    expect(matchesRequirement(requirement(), '通知 missing')).toBe(false);
    expect(matchesRequirement(requirement(), ' ')).toBe(true);
    expect(matchesRequirement(requirement({ body: undefined }), '后台')).toBe(false);
  });

  it('scopes counts, gaps and rows by system while all includes both systems', () => {
    const rows = [
      ...requirementSnapshot.requirements,
      requirement({ id: 'OTHER', systemKey: 'other', priority: 'P0' }),
    ];
    const tasks = [...requirementTasks, { ...requirementTasks[1]!, id: 'OTHER-TASK', systemKey: 'other' }];
    expect(filterRequirementSystem(rows, 'missing')).toEqual([]);
    const own = requirementsModel(rows, tasks, 'main', filter);
    expect(own.total).toBe(3);
    expect(own.counts.find((c) => c.status === 'confirmed')!.count).toBe(1);
    expect(own.p0).toBe(1);
    expect(own.gapCount).toBe(2);
    const all = requirementsModel(rows, tasks, 'all', filter);
    expect(all.total).toBe(4);
    expect(all.gapCount).toBe(4);
    expect(all.p0).toBe(2);
  });

  it('combines search, priority, status and gap filters without narrowing overview counts', () => {
    const model = requirementsModel(requirementSnapshot.requirements, requirementTasks, 'all', {
      query: '报表',
      priority: 'P0',
      status: 'scheduled',
      gapsOnly: true,
    });
    expect(model.groups[3]!.requirements.map((r) => r.id)).toEqual(['R-002']);
    expect(model.shown).toBe(1);
    expect(model.total).toBe(3);
    expect(
      requirementsModel(requirementSnapshot.requirements, requirementTasks, 'all', { ...filter, gapsOnly: true }).shown,
    ).toBe(1);
  });
});
