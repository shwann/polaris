import '../../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupPanel } from './GroupPanel';
import { sample } from '../../../../tests/fixtures/sample';
import { uiStore } from '../../../store/uiStore';
it('caps the initial group links at eight and selects a listed task', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ ...sample.tasks[0]!, id: 'task' + i, title: '项目' + i }));
  render(<GroupPanel items={items} lane="risk" all={false} />);
  expect(screen.getAllByRole('button')).toHaveLength(8);
  expect(screen.getByText('先连前 8 项 · 展开后连到全部 10 颗星')).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button')[0]!);
  expect(uiStore.getState().selected).toBe('task0');
});
