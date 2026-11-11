import '../../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WatchRows } from './WatchRows';
import { uiStore } from '../../../store/uiStore';
it('opens needs-you filtering, next-build and global overview from the watch rows', () => {
  render(<WatchRows />);
  fireEvent.click(screen.getByTitle('只看需要你处理的任务'));
  expect(uiStore.getState().mineOnly).toBe(true);
  fireEvent.click(screen.getByTitle('看正式 App 与下一版'));
  expect(uiStore.getState().dip).toBe(0);
  fireEvent.click(screen.getByTitle('北辰 · 总览：各系统与七个模块'));
  expect(uiStore.getState().dip).toBe(7);
});
