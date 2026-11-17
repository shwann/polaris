import '../../../tests/support';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SkyLegend, LEGEND_KEY, legendName } from './SkyLegend';
import { LANES } from '../../domain/lanes';
import { uiStore } from '../../store/uiStore';
import { layoutRegistry } from '../../layout/LayoutRegistry';

afterEach(() => vi.restoreAllMocks());

it('explains every group colour, mark, the late glow and the Dipper, open by default', () => {
  localStorage.removeItem(LEGEND_KEY);
  uiStore.setState({ sky: true });
  render(<SkyLegend />);
  for (const lane of LANES) expect(screen.getByText(legendName(lane.key, lane.name))).toBeTruthy();
  expect(screen.getByText('等你 / 等客户、等前置（较暗）')).toBeTruthy();
  expect(screen.getByText('等你超过 3 天')).toBeTruthy();
  expect(screen.getByText('每组连成星座，同一需求（或模块）更亮')).toBeTruthy();
  expect(screen.getByText('金色七星')).toBeTruthy();
  expect(screen.getByRole('button', { name: /图例/ }).getAttribute('aria-expanded')).toBe('true');
  expect(layoutRegistry.get('legend')).toBeTruthy();
});

it('remembers the folded state and opens folded next time', () => {
  localStorage.removeItem(LEGEND_KEY);
  uiStore.setState({ sky: true });
  const { unmount } = render(<SkyLegend />);
  fireEvent.click(screen.getByRole('button', { name: /图例/ }));
  expect(localStorage.getItem(LEGEND_KEY)).toBe('0');
  expect(screen.queryByText('已完成')).toBeNull();
  unmount();
  render(<SkyLegend />);
  expect(screen.getByRole('button', { name: /图例/ }).getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: /图例/ }));
  expect(localStorage.getItem(LEGEND_KEY)).toBe('1');
});

it('still renders and toggles when storage throws', () => {
  uiStore.setState({ sky: true });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('denied');
  });
  render(<SkyLegend />);
  expect(screen.getByText('开发中')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /图例/ }));
  expect(screen.queryByText('开发中')).toBeNull();
});

it('stays out of the board view', () => {
  uiStore.setState({ sky: false });
  const { container } = render(<SkyLegend />);
  expect((container.querySelector('#skylegend') as HTMLElement).hidden).toBe(true);
});

it('switches the Aquarius style between drops and the original jar, and remembers it', () => {
  uiStore.setState({ sky: true, aquariusStyle: 'drops' });
  render(<SkyLegend />);
  const group = screen.getByRole('group', { name: '水瓶样式' });
  expect(screen.getByText(/一滴一个版本/)).toBeTruthy();
  fireEvent.click(within(group).getByRole('button', { name: '瓶子' }));
  expect(uiStore.getState().aquariusStyle).toBe('jar');
  expect(localStorage.getItem('sky-aquarius')).toBe('jar');
  expect(screen.getByText(/瓶里是交付/)).toBeTruthy();
  fireEvent.click(within(group).getByRole('button', { name: '水滴' }));
  expect(uiStore.getState().aquariusStyle).toBe('drops');
  expect(localStorage.getItem('sky-aquarius')).toBe('drops');
});
