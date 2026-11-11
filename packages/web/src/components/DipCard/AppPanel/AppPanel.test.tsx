import '../../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppPanel } from './AppPanel';
import { sample } from '../../../../tests/fixtures/sample';
import { selectView } from '../../../domain/selectors';
import { uiStore } from '../../../store/uiStore';
it('lets the reader inspect a next-build candidate while keeping the build context', () => {
  render(<AppPanel view={selectView(sample, 'main')} />);
  fireEvent.click(screen.getByTitle('SEARCH 全文搜索'));
  expect(uiStore.getState().selected).toBe('SEARCH');
  expect(screen.getByText('下一版 1.3 候选 · 1 项')).toBeTruthy();
});
