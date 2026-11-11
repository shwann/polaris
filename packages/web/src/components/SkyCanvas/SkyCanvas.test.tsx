import '../../../tests/support';
import { it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { SkyCanvas } from './SkyCanvas';
import { getEngine, selectFromSky } from '../../hooks/skyBridge';
it('attaches and destroys the independent engine and does not recenter desktop pointer selections', () => {
  const { unmount } = render(<SkyCanvas />),
    engine = getEngine();
  expect(engine).toBeTruthy();
  const reveal = vi.spyOn(engine!, 'reveal');
  act(() => selectFromSky('EXPORT'));
  expect(reveal).not.toHaveBeenCalled();
  unmount();
  expect(getEngine()).toBeNull();
});
