import '../../tests/support';
import { describe, expect, it } from 'vitest';
import { clusterTitles, skyNames } from './taskNames';
import { FULL_FROM, TITLE_FROM, labelLines } from './draw/starLabels';
import { updateTasks } from './updateTasks';
import { fixture } from './testFixture';
import type { Task } from '../domain/types';

export const task = (id: string, code: string, systemKey = 'main'): Task => ({
  id,
  code,
  systemKey,
  title: 'Title',
  lane: 'risk',
  status: '',
  steps: [],
  reqIds: [],
  updatedAt: '2026-11-11',
});
it('disambiguates repeated codes per system without changing data, order or unique codes', () => {
  const tasks = [
    task('DESK5-DEFAULT', 'DESK5'),
    task('RISK-DRIFT', 'DESK5'),
    task('UX8-A', 'UX8'),
    task('UX8-B', 'UX8'),
    task('UNIQUE', 'CASH1'),
    task('OTHER', 'CASH1', 'other'),
  ];
  const copy = structuredClone(tasks),
    names = skyNames(tasks);
  expect([...names.values()]).toEqual(['DESK5-DEFAULT', 'RISK-DRIFT', 'UX8-A', 'UX8-B', 'CASH1', 'CASH1']);
  expect(tasks).toEqual(copy);
});
it('uses the same sky name for labels and tooltips while preserving board codes and removing stale duplicates', () => {
  const { s, registry } = fixture(),
    tasks = [task('DESK5-DEFAULT', 'DESK5'), task('RISK-DRIFT', 'DESK5')];
  updateTasks(s, tasks);
  const star = s.stars.get(tasks[0]!.id)!;
  expect(star.code).toBe('DESK5');
  expect(star.skyCode).toBe('DESK5-DEFAULT');
  const tips: string[] = [];
  s.events.onTooltip = (text) => tips.push(text);
  s.hover = star;
  s.onSky = true;
  s.emitTooltip();
  expect(tips.at(-1)).toContain('DESK5-DEFAULT');
  s.sky = false;
  s.emitTooltip();
  expect(tips.at(-1)).toBe('DESK5 Title');
  updateTasks(s, tasks.slice(0, 1));
  expect(star.skyCode).toBe('DESK5');
  registry.dispose();
});

describe('cluster title lead-ins', () => {
  const task = (id: string, title: string, lane = 'waiting') => ({ id, title, lane }) as Task;
  it('drops a lead-in shared inside the same group and keeps the distinctive rest', () => {
    const titles = clusterTitles([
      task('a', 'AI 专家：合同字段与参考成本摘录（简化版）'),
      task('b', 'AI 专家：历史分类与科目映射'),
      task('c', 'AI 专家：报价单读入（PU-17）'),
      task('d', '交付包与培训（12-29～31）'),
      task('e', 'AI 专家：只此一项', 'planned'),
    ]);
    expect(titles.get('a')).toBe('合同字段与参考成本摘录（简化版）');
    expect(titles.get('b')).toBe('历史分类与科目映射');
    expect(titles.get('c')).toBe('报价单读入（PU-17）');
    expect(titles.get('d')).toBe('交付包与培训（12-29～31）');
    // A lead-in nobody else in its own group shares stays.
    expect(titles.get('e')).toBe('AI 专家：只此一项');
  });
  it('never strips a title down to nothing or cuts inside a word', () => {
    const titles = clusterTitles([
      task('a', '平台：'),
      task('b', '平台：'),
      task('c', '平台识别服务'),
      task('d', '平台文件工具'),
    ]);
    expect(titles.get('a')).toBe('平台：');
    expect(titles.get('c')).toBe('平台识别服务');
  });
  it('shows the stripped title in short labels, at least 8 then 14+ characters as the zoom grows', () => {
    const title = 'AI 专家：合同字段与参考成本摘录（简化版）',
      short = clusterTitles([task('a', title), task('b', 'AI 专家：历史分类')]).get('a')!;
    const first = labelLines('AIX2', title, TITLE_FROM, true, true, short)[1]!,
      later = labelLines('AIX2', title, FULL_FROM - 0.01, true, true, short)[1]!;
    expect(first.startsWith('合同字段')).toBe(true);
    expect(first.replace('…', '').length).toBeGreaterThanOrEqual(8);
    expect(later.replace('…', '').length).toBeGreaterThanOrEqual(14);
    expect(
      new Set(
        ['AIX2', 'AIX3', 'AIX4'].map(
          (c, i) =>
            labelLines(
              c,
              title,
              TITLE_FROM,
              true,
              true,
              ['合同字段与参考成本摘录', '历史分类与科目映射', '报价单读入（PU-17）'][i],
            )[1],
        ),
      ).size,
    ).toBe(3);
    // The full wrapped title keeps the lead-in.
    expect(labelLines('AIX2', title, FULL_FROM, true, true, short).slice(1).join('')).toBe(title);
  });
});
