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

it('hides the tooltip container synchronously without collapsing visible content into a fading empty frame', async () => {
  const { showTooltip } = await import('./tooltipBridge');
  const { container } = render(<SkyCanvas />);
  const tip = container.querySelector<HTMLDivElement>('div[aria-hidden]')!;
  act(() => showTooltip('CASH1', '可拖动', 400, 400));
  expect(tip.hidden).toBe(false);
  const content = tip.textContent;
  act(() => showTooltip('', '', 500, 300));
  expect(tip.hidden).toBe(true);
  expect(tip.textContent).toBe(content);
  act(() => showTooltip('', '', 550, 320));
  expect(tip.hidden).toBe(true);
});
