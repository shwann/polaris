import '../../../../tests/support';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TaskRow } from './TaskRow';
import { Lanes } from '../Lanes';
import { Dashboard } from '../../../App';
import { Figures } from '../../Figures/Figures';
import { RequirementRow } from '../../Requirements/RequirementRow';
import { dataStore } from '../../../store/dataStore';
import { sample } from '../../../../tests/fixtures/sample';
import { requirement } from '../../../../tests/fixtures/requirements';

const task = {
  ...sample.tasks.find((t) => t.id === 'EXPORT')!,
  status: '这是一个很长很长的状态说明，带提交号 abc1234',
};
const credentials = { token: 'token', page: 'page' };

it('keeps only the doing and waiting figure cards vivid', () => {
  render(<Figures />);
  const vivid = [...document.querySelectorAll('#figures [data-tone="vivid"]')].map((n) => n.textContent);
  expect(vivid).toHaveLength(2);
  expect(vivid[0]).toContain('开发中');
  expect(vivid[1]).toContain('等你回复');
  expect(document.querySelectorAll('#figures [data-tone="quiet"]')).toHaveLength(5);
});

it('collapses edit controls until the card edit toggle is pressed, and Esc closes them', () => {
  dataStore.setState({ origin: 'local', credentials });
  render(<TaskRow task={task} changed={false} />);
  expect(screen.queryByLabelText(`${task.code} 分组`)).toBeNull();
  const toggle = screen.getByRole('button', { name: `编辑 ${task.code} 的分组和进度` });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);
  const lane = screen.getByLabelText(`${task.code} 分组`);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  fireEvent.keyDown(lane, { key: 'Escape' });
  expect(screen.queryByLabelText(`${task.code} 分组`)).toBeNull();
  expect(document.activeElement).toBe(toggle);
});

it.each(['mirror', 'db'] as const)('shows no edit toggle for the read-only %s source', (origin) => {
  dataStore.setState({ origin, credentials: null });
  render(<TaskRow task={task} changed={false} />);
  expect(document.querySelector('[data-edit-toggle]')).toBeNull();
});

it('renders long status chips on one line with the full text as title', () => {
  render(<TaskRow task={task} changed={false} />);
  const chip = screen.getByTitle(task.status);
  expect(chip.textContent).toBe(task.status);
  expect(chip.className).toMatch(/p-TaskRow-chip/);
});

it('lifts the waiting group into a full-width two-column block on wide screens', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width: 1280px'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  render(<Lanes />);
  const waiting = document.getElementById('lane-waiting')!.closest('section')!;
  expect(waiting.parentElement!.id).toBe('main');
  expect(waiting.querySelector('[class*="p-LaneSection-two"]')).toBeTruthy();
});
it('keeps the waiting group inside the balanced columns on narrower screens', () => {
  render(<Lanes />);
  const waiting = document.getElementById('lane-waiting')!.closest('section')!;
  expect(waiting.parentElement!.id).not.toBe('main');
  expect(waiting.querySelector('[class*="p-LaneSection-two"]')).toBeNull();
});

it('does not replay the entry animation once the board has booted', () => {
  dataStore.setState({ booted: false });
  render(<Dashboard />);
  expect(document.querySelectorAll('.boot').length).toBeGreaterThan(0);
  dataStore.setState({ booted: true });
  fireEvent.click(screen.getByRole('button', { name: '需求' }));
  fireEvent.click(screen.getByRole('button', { name: '任务' }));
  expect(document.querySelectorAll('.boot')).toHaveLength(0);
});

it('lays a requirement summary out in fixed columns with scope tags under the title', () => {
  const { container } = render(
    <RequirementRow requirement={{ ...requirement(), scope: '台账' }} tasks={[]} constellation="北斗" />,
  );
  const summary = container.querySelector('summary')!;
  expect([...summary.children].map((n) => n.className.replace(/^p-RequirementRow-(\w+).*$/, '$1'))).toEqual([
    'code',
    'main',
    'meta',
    'acceptance',
    'tasks',
  ]);
  const main = summary.children[1]!;
  expect(within(main as HTMLElement).getByText('台账')).toBeTruthy();
  expect(within(main as HTMLElement).getByText('北斗')).toBeTruthy();
});
