import '../../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Lanes } from '../Lanes';
import { dataStore } from '../../../store/dataStore';
import { sample } from '../../../../tests/fixtures/sample';
it('starts completed work collapsed and nests the older-than-three-days archive', () => {
  dataStore.setState({
    snapshot: {
      ...sample,
      tasks: sample.tasks.map((t) => (t.id === 'ONBOARD' ? { ...t, updatedAt: '2026-11-01T09:00:00+08:00' } : t)),
    },
  });
  render(<Lanes />);
  const title = screen.getByText('已完成', { selector: '.p-LaneSection-name' }),
    details = title.closest('details')!;
  expect(details.open).toBe(false);
  fireEvent.click(title.closest('summary')!);
  expect(details.open).toBe(true);
  const older = screen.getByText('更早完成的 1 项（3 天前）').closest('details')!;
  expect(older.open).toBe(false);
  fireEvent.click(older.querySelector('summary')!);
  expect(older.open).toBe(true);
});
