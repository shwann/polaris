import '../../../tests/support';
import { expect, it } from 'vitest';
import { fixture } from '../testFixture';
import { updateTasks } from '../updateTasks';
import { rebuild } from './clusters';
import { assignSlots, chainEdges, chainsOf, codePrefix, slotOf } from './chains';
import { sample } from '../../../tests/fixtures/sample';
import type { Task } from '../../domain/types';

const base = sample.tasks.find((t) => t.id === 'EXPORT')!;
const make = (id: string, patch: Partial<Task> = {}): Task => ({ ...base, id, code: id, reqIds: [], ...patch });

it('chains by shared requirement first, then by the code prefix', () => {
  expect(['AIX2', 'CASH-NEXT', 'DESK10', '12', 'recon3'].map(codePrefix)).toEqual([
    'AIX',
    'CASH',
    'DESK',
    undefined,
    'RECON',
  ]);
  const chains = chainsOf(
    [
      make('AIX2', { reqIds: ['R1'] }),
      make('CASH1', { reqIds: ['R1', 'R9'] }),
      make('AIX4'),
      make('AIX5'),
      make('X9', { reqIds: ['R9'], lane: 'doing' }),
    ],
    new Map([['R1', '付款节点']]),
  );
  expect(chains.get('AIX2')).toEqual({ key: 'req:R1', label: '需求 R1 付款节点' });
  expect(chains.get('CASH1')!.key).toBe('req:R1');
  expect(chains.get('AIX4')).toEqual({ key: 'mod:AIX', label: '同组：AIX' });
  expect(chains.get('X9')).toEqual({ key: 'req:R9', label: '需求 R9' });
});

it('strings each chain separately, never joins chains and draws nothing for a lone star', () => {
  const { s, star } = fixture();
  const stars = [
    star('A1', 0, 0, 'waiting'),
    star('A2', 10, 0, 'waiting'),
    star('A3', 20, 0, 'waiting'),
    star('B1', 100, 0, 'waiting'),
    star('B2', 110, 0, 'waiting'),
    star('C1', 50, 50, 'waiting'),
  ];
  for (const x of stars) x.chain = x.id === 'C1' ? 'mod:C' : `mod:${x.id[0]}`;
  const edges = chainEdges(stars, (x) => [x.x, x.y]).map(([a, b]) => `${a.id}-${b.id}`);
  expect(edges).toEqual(['A1-A2', 'A2-A3', 'B1-B2']);
  expect(s.stars.size).toBe(6);
});

it('gives each chain neighbouring slots from the same set of places', () => {
  const { star } = fixture();
  const ids = ['AIX1', 'CASH1', 'AIX2', 'DESK1', 'CASH2', 'AIX3', 'DESK2', 'RECON1'];
  const stars = ids.map((id) => {
    const x = star(id, 0, 0, 'waiting');
    x.chain = `mod:${codePrefix(id)}`;
    return x;
  });
  const at = (x: { ang: number; rad: number }) => [Math.cos(x.ang) * x.rad * 1.25, Math.sin(x.ang) * x.rad * 0.85];
  const spread = () =>
    stars.reduce(
      (sum, a) =>
        sum +
        stars
          .filter((b) => b !== a && b.chain === a.chain)
          .reduce((t, b) => t + Math.hypot(at(a)[0]! - at(b)[0]!, at(a)[1]! - at(b)[1]!), 0),
      0,
    );
  for (const x of stars) Object.assign(x, slotOf(x.id));
  const before = spread();
  assignSlots(stars, false);
  const key = (p: { ang: number; rad: number }) => `${p.ang.toFixed(6)}:${p.rad.toFixed(6)}`;
  expect(stars.map(key).sort()).toEqual(ids.map((id) => key(slotOf(id))).sort());
  // Chain mates end up closer together than the random places their ids would give them.
  expect(spread()).toBeLessThan(before * 0.8);
});

it('marks only overdue 等你 stars late and keeps chain data on the stars after a rebuild', () => {
  const { s } = fixture();
  s.rebuild = () => rebuild(s);
  updateTasks(
    s,
    [
      make('U1'),
      make('C1', { waitingOn: 'customer' }),
      make('P1', { waitingOn: 'dependency', reqIds: ['R1'] }),
      make('P2', { waitingOn: 'dependency', reqIds: ['R1'] }),
    ],
    new Map([['R1', '对账']]),
  );
  expect(['U1', 'C1', 'P1'].map((id) => [s.stars.get(id)!.wait, s.stars.get(id)!.late])).toEqual([
    ['user', true],
    ['customer', false],
    ['dependency', false],
  ]);
  expect(s.stars.get('P1')!.chainLabel).toBe('需求 R1 对账');
  expect(s.trees.get('waiting')!.map(([a, b]) => [a.id, b.id].sort().join('-'))).toEqual(['P1-P2']);
});
