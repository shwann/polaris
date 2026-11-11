import '../../../tests/support';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FilterBar } from './FilterBar';
import { Lanes } from '../Lanes/Lanes';
it('debounces multiword search and combines it with only-needs-me', async () => {
  render(
    <>
      <FilterBar />
      <Lanes />
    </>,
  );
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'export CSV' } });
  await act(() => vi.advanceTimersByTimeAsync(150));
  expect(screen.getByText('命中 1 / 7 项')).toBeTruthy();
  expect(screen.queryByText('登录页改版')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '只看需要我的' }));
  expect(screen.getByText('导出格式要你定')).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'LOGIN' } });
  await act(() => vi.advanceTimersByTimeAsync(150));
  expect(screen.getByText('命中 0 / 7 项')).toBeTruthy();
});
